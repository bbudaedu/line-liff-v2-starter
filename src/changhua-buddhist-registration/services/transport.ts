import { TransportOption } from '../types';
import { apiClient } from './api';

export interface TransportRegistrationData {
  eventId: string;
  userId: string;
  locationId: string | null;
  timestamp: string;
}

export interface TransportRegistrationResponse {
  success: boolean;
  registrationId?: string;
  message?: string;
}

/**
 * 交通車服務類別
 * 處理交通車相關的 API 呼叫
 */
export class TransportService {
  /**
   * 取得指定活動的交通車選項
   */
  static async getTransportOptions(eventId: string): Promise<TransportOption[]> {
    try {
      const response = await apiClient.get(`/api/events/${eventId}/transport`);
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch transport options:', error);
      throw new Error('無法載入交通車資訊');
    }
  }

  /**
   * 即時更新交通車座位數量
   */
  static async updateSeatAvailability(locationId: string): Promise<TransportOption> {
    try {
      const response = await apiClient.get(`/api/transport/${locationId}/availability`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to update seat availability:', error);
      throw new Error('無法更新座位資訊');
    }
  }

  /**
   * 檢查交通車地點是否額滿
   */
  static async checkLocationAvailability(locationId: string): Promise<boolean> {
    try {
      const response = await apiClient.get(`/api/transport/${locationId}/check`);
      return response.data.data.available;
    } catch (error) {
      console.error('Failed to check location availability:', error);
      return false;
    }
  }

  /**
   * 登記交通車
   */
  static async registerTransport(data: TransportRegistrationData): Promise<TransportRegistrationResponse> {
    try {
      const response = await apiClient.post('/api/transport/register', data);
      return {
        success: true,
        registrationId: response.data.data.registrationId,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('Failed to register transport:', error);
      
      if (error.response?.status === 409) {
        throw new Error('此交通車地點已額滿，請選擇其他地點');
      } else if (error.response?.status === 400) {
        throw new Error('登記資料有誤，請檢查後重新提交');
      } else {
        throw new Error('交通車登記失敗，請稍後再試');
      }
    }
  }

  /**
   * 取消交通車登記
   */
  static async cancelTransportRegistration(registrationId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/transport/register/${registrationId}`);
    } catch (error) {
      console.error('Failed to cancel transport registration:', error);
      throw new Error('取消交通車登記失敗');
    }
  }

  /**
   * 修改交通車登記
   */
  static async updateTransportRegistration(
    registrationId: string, 
    newLocationId: string | null
  ): Promise<TransportRegistrationResponse> {
    try {
      const response = await apiClient.put(`/api/transport/register/${registrationId}`, {
        locationId: newLocationId,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        registrationId: response.data.data.registrationId,
        message: response.data.message
      };
    } catch (error: any) {
      console.error('Failed to update transport registration:', error);
      
      if (error.response?.status === 409) {
        throw new Error('新選擇的交通車地點已額滿');
      } else {
        throw new Error('修改交通車登記失敗');
      }
    }
  }

  /**
   * 取得使用者的交通車登記狀態
   */
  static async getUserTransportRegistration(eventId: string, userId: string): Promise<TransportRegistrationData | null> {
    try {
      const response = await apiClient.get(`/api/transport/user/${userId}/event/${eventId}`);
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // 使用者尚未登記交通車
      }
      console.error('Failed to get user transport registration:', error);
      throw new Error('無法取得交通車登記狀態');
    }
  }

  /**
   * 批次更新多個地點的座位資訊
   */
  static async batchUpdateSeatAvailability(locationIds: string[]): Promise<TransportOption[]> {
    try {
      const response = await apiClient.post('/api/transport/batch-update', {
        locationIds
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to batch update seat availability:', error);
      throw new Error('無法更新座位資訊');
    }
  }

  /**
   * 取得交通車地點的詳細資訊（包含地圖座標）
   */
  static async getLocationDetails(locationId: string): Promise<TransportOption> {
    try {
      const response = await apiClient.get(`/api/transport/${locationId}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to get location details:', error);
      throw new Error('無法取得地點詳細資訊');
    }
  }

  /**
   * 搜尋附近的交通車地點
   */
  static async searchNearbyLocations(
    eventId: string, 
    userLat: number, 
    userLng: number, 
    radiusKm: number = 50
  ): Promise<TransportOption[]> {
    try {
      const response = await apiClient.get(`/api/transport/nearby`, {
        params: {
          eventId,
          lat: userLat,
          lng: userLng,
          radius: radiusKm
        }
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to search nearby locations:', error);
      throw new Error('無法搜尋附近的交通車地點');
    }
  }

  /**
   * 取得交通車路線資訊
   */
  static async getRouteInfo(locationId: string): Promise<{
    estimatedDuration: number;
    distance: number;
    waypoints: Array<{ lat: number; lng: number; name: string }>;
  }> {
    try {
      const response = await apiClient.get(`/api/transport/${locationId}/route`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to get route info:', error);
      throw new Error('無法取得路線資訊');
    }
  }
}

/**
 * 交通車座位狀態即時更新 Hook
 */
export const useTransportSeatUpdates = (locationIds: string[]) => {
  const [seatData, setSeatData] = React.useState<Record<string, TransportOption>>({});
  const [isUpdating, setIsUpdating] = React.useState(false);

  const updateSeats = React.useCallback(async () => {
    if (locationIds.length === 0) return;

    try {
      setIsUpdating(true);
      const updatedOptions = await TransportService.batchUpdateSeatAvailability(locationIds);
      
      const seatMap = updatedOptions.reduce((acc, option) => {
        acc[option.id] = option;
        return acc;
      }, {} as Record<string, TransportOption>);
      
      setSeatData(seatMap);
    } catch (error) {
      console.error('Failed to update seat data:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [locationIds]);

  React.useEffect(() => {
    updateSeats();
    
    // 每 30 秒更新一次座位資訊
    const interval = setInterval(updateSeats, 30000);
    
    return () => clearInterval(interval);
  }, [updateSeats]);

  return { seatData, isUpdating, refreshSeats: updateSeats };
};

// 匯出預設服務實例
export default TransportService;