import { TransportService } from '../../../services/transport';
import { apiClient } from '../../../services/api';
import { TransportOption } from '../../../types';

// Mock the API client
jest.mock('../../../services/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  }
}));

describe('TransportService', () => {
  const mockTransportOption: TransportOption = {
    id: 'location-1',
    eventId: 'test-event-1',
    name: '彰化火車站',
    address: '彰化縣彰化市三民路1號',
    pickupTime: new Date('2024-01-15T07:30:00'),
    maxSeats: 45,
    bookedSeats: 32,
    coordinates: { lat: 24.0818, lng: 120.5387 }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTransportOptions', () => {
    it('fetches transport options successfully', async () => {
      const mockResponse = {
        data: {
          data: [mockTransportOption]
        }
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await TransportService.getTransportOptions('test-event-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/events/test-event-1/transport');
      expect(result).toEqual([mockTransportOption]);
    });

    it('handles API error gracefully', async () => {
      (apiClient.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(TransportService.getTransportOptions('test-event-1'))
        .rejects.toThrow('無法載入交通車資訊');
    });

    it('returns empty array when no data', async () => {
      const mockResponse = { data: {} };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await TransportService.getTransportOptions('test-event-1');

      expect(result).toEqual([]);
    });
  });

  describe('updateSeatAvailability', () => {
    it('updates seat availability successfully', async () => {
      const mockResponse = {
        data: {
          data: mockTransportOption
        }
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await TransportService.updateSeatAvailability('location-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/transport/location-1/availability');
      expect(result).toEqual(mockTransportOption);
    });

    it('handles update error', async () => {
      (apiClient.get as jest.Mock).mockRejectedValue(new Error('Update failed'));

      await expect(TransportService.updateSeatAvailability('location-1'))
        .rejects.toThrow('無法更新座位資訊');
    });
  });

  describe('checkLocationAvailability', () => {
    it('returns true when location is available', async () => {
      const mockResponse = {
        data: {
          data: { available: true }
        }
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await TransportService.checkLocationAvailability('location-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/transport/location-1/check');
      expect(result).toBe(true);
    });

    it('returns false when location is not available', async () => {
      const mockResponse = {
        data: {
          data: { available: false }
        }
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await TransportService.checkLocationAvailability('location-1');

      expect(result).toBe(false);
    });

    it('returns false on error', async () => {
      (apiClient.get as jest.Mock).mockRejectedValue(new Error('Check failed'));

      const result = await TransportService.checkLocationAvailability('location-1');

      expect(result).toBe(false);
    });
  });

  describe('registerTransport', () => {
    const registrationData = {
      eventId: 'test-event-1',
      userId: 'test-user-1',
      locationId: 'location-1',
      timestamp: '2024-01-15T10:00:00.000Z'
    };

    it('registers transport successfully', async () => {
      const mockResponse = {
        data: {
          data: { registrationId: 'reg-123' },
          message: '交通車登記成功'
        }
      };
      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await TransportService.registerTransport(registrationData);

      expect(apiClient.post).toHaveBeenCalledWith('/api/transport/register', registrationData);
      expect(result).toEqual({
        success: true,
        registrationId: 'reg-123',
        message: '交通車登記成功'
      });
    });

    it('handles location full error (409)', async () => {
      const error = {
        response: { status: 409 }
      };
      (apiClient.post as jest.Mock).mockRejectedValue(error);

      await expect(TransportService.registerTransport(registrationData))
        .rejects.toThrow('此交通車地點已額滿，請選擇其他地點');
    });

    it('handles bad request error (400)', async () => {
      const error = {
        response: { status: 400 }
      };
      (apiClient.post as jest.Mock).mockRejectedValue(error);

      await expect(TransportService.registerTransport(registrationData))
        .rejects.toThrow('登記資料有誤，請檢查後重新提交');
    });

    it('handles general error', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Server error'));

      await expect(TransportService.registerTransport(registrationData))
        .rejects.toThrow('交通車登記失敗，請稍後再試');
    });
  });

  describe('cancelTransportRegistration', () => {
    it('cancels registration successfully', async () => {
      (apiClient.delete as jest.Mock).mockResolvedValue({});

      await TransportService.cancelTransportRegistration('reg-123');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/transport/register/reg-123');
    });

    it('handles cancellation error', async () => {
      (apiClient.delete as jest.Mock).mockRejectedValue(new Error('Cancel failed'));

      await expect(TransportService.cancelTransportRegistration('reg-123'))
        .rejects.toThrow('取消交通車登記失敗');
    });
  });

  describe('updateTransportRegistration', () => {
    it('updates registration successfully', async () => {
      const mockResponse = {
        data: {
          data: { registrationId: 'reg-123' },
          message: '交通車登記已更新'
        }
      };
      (apiClient.put as jest.Mock).mockResolvedValue(mockResponse);

      const result = await TransportService.updateTransportRegistration('reg-123', 'location-2');

      expect(apiClient.put).toHaveBeenCalledWith('/api/transport/register/reg-123', {
        locationId: 'location-2',
        timestamp: expect.any(String)
      });
      expect(result).toEqual({
        success: true,
        registrationId: 'reg-123',
        message: '交通車登記已更新'
      });
    });

    it('handles new location full error', async () => {
      const error = {
        response: { status: 409 }
      };
      (apiClient.put as jest.Mock).mockRejectedValue(error);

      await expect(TransportService.updateTransportRegistration('reg-123', 'location-2'))
        .rejects.toThrow('新選擇的交通車地點已額滿');
    });

    it('handles update error', async () => {
      (apiClient.put as jest.Mock).mockRejectedValue(new Error('Update failed'));

      await expect(TransportService.updateTransportRegistration('reg-123', 'location-2'))
        .rejects.toThrow('修改交通車登記失敗');
    });
  });

  describe('getUserTransportRegistration', () => {
    const registrationData = {
      eventId: 'test-event-1',
      userId: 'test-user-1',
      locationId: 'location-1',
      timestamp: '2024-01-15T10:00:00.000Z'
    };

    it('gets user registration successfully', async () => {
      const mockResponse = {
        data: {
          data: registrationData
        }
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await TransportService.getUserTransportRegistration('test-event-1', 'test-user-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/transport/user/test-user-1/event/test-event-1');
      expect(result).toEqual(registrationData);
    });

    it('returns null when no registration found (404)', async () => {
      const error = {
        response: { status: 404 }
      };
      (apiClient.get as jest.Mock).mockRejectedValue(error);

      const result = await TransportService.getUserTransportRegistration('test-event-1', 'test-user-1');

      expect(result).toBeNull();
    });

    it('handles other errors', async () => {
      (apiClient.get as jest.Mock).mockRejectedValue(new Error('Server error'));

      await expect(TransportService.getUserTransportRegistration('test-event-1', 'test-user-1'))
        .rejects.toThrow('無法取得交通車登記狀態');
    });
  });

  describe('batchUpdateSeatAvailability', () => {
    it('batch updates seat availability successfully', async () => {
      const mockResponse = {
        data: {
          data: [mockTransportOption]
        }
      };
      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await TransportService.batchUpdateSeatAvailability(['location-1', 'location-2']);

      expect(apiClient.post).toHaveBeenCalledWith('/api/transport/batch-update', {
        locationIds: ['location-1', 'location-2']
      });
      expect(result).toEqual([mockTransportOption]);
    });

    it('handles batch update error', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Batch update failed'));

      await expect(TransportService.batchUpdateSeatAvailability(['location-1']))
        .rejects.toThrow('無法更新座位資訊');
    });
  });

  describe('getLocationDetails', () => {
    it('gets location details successfully', async () => {
      const mockResponse = {
        data: {
          data: mockTransportOption
        }
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await TransportService.getLocationDetails('location-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/transport/location-1');
      expect(result).toEqual(mockTransportOption);
    });

    it('handles get details error', async () => {
      (apiClient.get as jest.Mock).mockRejectedValue(new Error('Get details failed'));

      await expect(TransportService.getLocationDetails('location-1'))
        .rejects.toThrow('無法取得地點詳細資訊');
    });
  });

  describe('searchNearbyLocations', () => {
    it('searches nearby locations successfully', async () => {
      const mockResponse = {
        data: {
          data: [mockTransportOption]
        }
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await TransportService.searchNearbyLocations('test-event-1', 24.0818, 120.5387);

      expect(apiClient.get).toHaveBeenCalledWith('/api/transport/nearby', {
        params: {
          eventId: 'test-event-1',
          lat: 24.0818,
          lng: 120.5387,
          radius: 50
        }
      });
      expect(result).toEqual([mockTransportOption]);
    });

    it('uses custom radius', async () => {
      const mockResponse = {
        data: {
          data: [mockTransportOption]
        }
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      await TransportService.searchNearbyLocations('test-event-1', 24.0818, 120.5387, 30);

      expect(apiClient.get).toHaveBeenCalledWith('/api/transport/nearby', {
        params: {
          eventId: 'test-event-1',
          lat: 24.0818,
          lng: 120.5387,
          radius: 30
        }
      });
    });

    it('handles search error', async () => {
      (apiClient.get as jest.Mock).mockRejectedValue(new Error('Search failed'));

      await expect(TransportService.searchNearbyLocations('test-event-1', 24.0818, 120.5387))
        .rejects.toThrow('無法搜尋附近的交通車地點');
    });
  });

  describe('getRouteInfo', () => {
    it('gets route info successfully', async () => {
      const mockRouteInfo = {
        estimatedDuration: 45,
        distance: 25.5,
        waypoints: [
          { lat: 24.0818, lng: 120.5387, name: '彰化火車站' },
          { lat: 24.1234, lng: 120.5678, name: '中途站' }
        ]
      };
      const mockResponse = {
        data: {
          data: mockRouteInfo
        }
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      const result = await TransportService.getRouteInfo('location-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/transport/location-1/route');
      expect(result).toEqual(mockRouteInfo);
    });

    it('handles route info error', async () => {
      (apiClient.get as jest.Mock).mockRejectedValue(new Error('Route info failed'));

      await expect(TransportService.getRouteInfo('location-1'))
        .rejects.toThrow('無法取得路線資訊');
    });
  });
});