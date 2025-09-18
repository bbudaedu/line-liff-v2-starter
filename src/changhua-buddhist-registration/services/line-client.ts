import { apiClient } from './api';
import { 
  LineFriendshipStatus, 
  LineNotificationRequest, 
  LineBulkNotificationRequest,
  Registration,
  Event,
  User 
} from '@/types';
import { API_ENDPOINTS } from '@/utils/constants';

/**
 * 客戶端 LINE 訊息服務
 * 提供前端呼叫 LINE 訊息 API 的介面
 */
export class LineClientService {
  /**
   * 檢查使用者好友狀態
   */
  async checkFriendshipStatus(userId: string): Promise<LineFriendshipStatus> {
    try {
      const response = await apiClient.get(
        `${API_ENDPOINTS.LINE_FRIENDSHIP}?userId=${encodeURIComponent(userId)}`
      );

      if (!response.success) {
        throw new Error(response.message || '檢查好友狀態失敗');
      }

      return response.data;
    } catch (error: any) {
      console.error('Error checking friendship status:', error);
      
      // 如果是網路錯誤或伺服器錯誤，返回預設狀態
      return {
        isFriend: false,
        canSendMessage: false,
        guidanceMessage: '為了接收活動通知和重要資訊，請先加入我們的官方帳號為好友。',
      };
    }
  }

  /**
   * 發送報名成功通知
   */
  async sendRegistrationSuccessNotification(
    userId: string,
    registration: Registration,
    event: Event
  ): Promise<boolean> {
    try {
      const request: LineNotificationRequest = {
        userId,
        type: 'registration_success',
        data: {
          registration,
          event,
        },
      };

      const response = await apiClient.post(API_ENDPOINTS.LINE_NOTIFY, request);
      
      if (!response.success) {
        console.error('Failed to send registration success notification:', response.message);
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('Error sending registration success notification:', error);
      
      // 如果是好友狀態問題，不視為錯誤
      if (error.code === 'NOT_FRIEND') {
        console.warn('User is not a friend, notification not sent');
        return false;
      }
      
      return false;
    }
  }

  /**
   * 發送活動提醒通知
   */
  async sendEventReminder(
    userId: string,
    registration: Registration,
    event: Event,
    reminderType: 'day_before' | 'hour_before'
  ): Promise<boolean> {
    try {
      const request: LineNotificationRequest = {
        userId,
        type: 'event_reminder',
        data: {
          registration,
          event,
          reminderType,
        },
      };

      const response = await apiClient.post(API_ENDPOINTS.LINE_NOTIFY, request);
      
      if (!response.success) {
        console.error('Failed to send event reminder:', response.message);
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('Error sending event reminder:', error);
      return false;
    }
  }

  /**
   * 發送重要資訊通知
   */
  async sendImportantInfo(
    userId: string,
    title: string,
    content: string,
    actionUrl?: string
  ): Promise<boolean> {
    try {
      const request: LineNotificationRequest = {
        userId,
        type: 'important_info',
        data: {
          title,
          content,
          actionUrl,
        },
      };

      const response = await apiClient.post(API_ENDPOINTS.LINE_NOTIFY, request);
      
      if (!response.success) {
        console.error('Failed to send important info:', response.message);
        return false;
      }

      return true;
    } catch (error: any) {
      console.error('Error sending important info:', error);
      return false;
    }
  }

  /**
   * 批量發送通知
   */
  async sendBulkNotifications(
    userIds: string[],
    messageType: 'registration_success' | 'event_reminder' | 'transport_info',
    data: any
  ): Promise<{ success: number; failed: number }> {
    try {
      const request: LineBulkNotificationRequest = {
        userIds,
        messageTemplate: {
          type: messageType,
          data,
        },
      };

      const response = await apiClient.post(API_ENDPOINTS.LINE_BULK_NOTIFY, request);
      
      if (!response.success) {
        console.error('Failed to send bulk notifications:', response.message);
        return { success: 0, failed: userIds.length };
      }

      return {
        success: response.data.successCount,
        failed: response.data.failedCount,
      };
    } catch (error: any) {
      console.error('Error sending bulk notifications:', error);
      return { success: 0, failed: userIds.length };
    }
  }

  /**
   * 觸發活動提醒發送（管理員功能）
   */
  async triggerEventReminders(
    eventId: string,
    reminderType: 'day_before' | 'hour_before'
  ): Promise<{ success: number; failed: number }> {
    try {
      const request = {
        eventId,
        reminderType,
      };

      const response = await apiClient.post(API_ENDPOINTS.LINE_SEND_REMINDERS, request);
      
      if (!response.success) {
        console.error('Failed to trigger event reminders:', response.message);
        return { success: 0, failed: 0 };
      }

      return {
        success: response.data.totalSuccess,
        failed: response.data.totalFailed,
      };
    } catch (error: any) {
      console.error('Error triggering event reminders:', error);
      return { success: 0, failed: 0 };
    }
  }

  /**
   * 檢查並引導使用者加好友
   */
  async checkAndGuideFriendship(userId: string): Promise<{
    needsGuidance: boolean;
    guidanceMessage?: string;
  }> {
    try {
      const status = await this.checkFriendshipStatus(userId);
      
      return {
        needsGuidance: !status.isFriend,
        guidanceMessage: status.guidanceMessage,
      };
    } catch (error) {
      console.error('Error checking friendship for guidance:', error);
      return {
        needsGuidance: true,
        guidanceMessage: '為了接收活動通知和重要資訊，請先加入我們的官方帳號為好友。',
      };
    }
  }

  /**
   * 在報名成功後自動發送通知並檢查好友狀態
   */
  async handleRegistrationSuccess(
    user: User,
    registration: Registration,
    event: Event
  ): Promise<{
    notificationSent: boolean;
    friendshipGuidance?: string;
  }> {
    try {
      // 先檢查好友狀態
      const friendshipStatus = await this.checkFriendshipStatus(user.lineUserId);
      
      if (!friendshipStatus.isFriend) {
        return {
          notificationSent: false,
          friendshipGuidance: friendshipStatus.guidanceMessage,
        };
      }

      // 如果是好友，發送通知
      const notificationSent = await this.sendRegistrationSuccessNotification(
        user.lineUserId,
        registration,
        event
      );

      return {
        notificationSent,
      };
    } catch (error) {
      console.error('Error handling registration success:', error);
      return {
        notificationSent: false,
        friendshipGuidance: '為了接收活動通知和重要資訊，請先加入我們的官方帳號為好友。',
      };
    }
  }
}

// 建立全域服務實例
export const lineClientService = new LineClientService();
export default lineClientService;