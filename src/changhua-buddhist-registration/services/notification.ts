import { lineMessagingService } from './line-messaging';
import { Registration, Event, User } from '@/types';
import { apiClient } from './api';

/**
 * 通知服務 - 整合 LINE 訊息通知與業務邏輯
 */
export class NotificationService {
  /**
   * 發送報名成功通知
   */
  async sendRegistrationSuccessNotification(
    user: User,
    registration: Registration,
    event: Event
  ): Promise<boolean> {
    try {
      // 檢查好友狀態
      const friendshipStatus = await lineMessagingService.checkFriendshipStatus(user.lineUserId);
      
      if (!friendshipStatus.canSendMessage) {
        console.warn(`Cannot send registration success notification to user ${user.lineUserId}: not a friend`);
        return false;
      }

      // 發送通知
      await lineMessagingService.sendRegistrationSuccessNotification(
        user.lineUserId,
        registration,
        event
      );

      console.log(`Registration success notification sent to user ${user.lineUserId}`);
      return true;
    } catch (error) {
      console.error('Error sending registration success notification:', error);
      return false;
    }
  }

  /**
   * 發送活動提醒通知
   */
  async sendEventReminder(
    user: User,
    registration: Registration,
    event: Event,
    reminderType: 'day_before' | 'hour_before'
  ): Promise<boolean> {
    try {
      // 檢查好友狀態
      const friendshipStatus = await lineMessagingService.checkFriendshipStatus(user.lineUserId);
      
      if (!friendshipStatus.canSendMessage) {
        console.warn(`Cannot send event reminder to user ${user.lineUserId}: not a friend`);
        return false;
      }

      // 發送提醒
      await lineMessagingService.sendEventReminder(
        user.lineUserId,
        registration,
        event,
        reminderType
      );

      console.log(`Event reminder sent to user ${user.lineUserId} (${reminderType})`);
      return true;
    } catch (error) {
      console.error('Error sending event reminder:', error);
      return false;
    }
  }

  /**
   * 發送重要資訊推送
   */
  async sendImportantInfo(
    userIds: string[],
    title: string,
    content: string,
    actionUrl?: string
  ): Promise<{ success: string[]; failed: string[] }> {
    try {
      const messageTemplate = {
        type: 'transport_info' as const,
        data: {
          title,
          content,
          actionUrl,
        },
      };

      const result = await lineMessagingService.sendBulkMessages(userIds, messageTemplate);
      
      console.log(`Important info sent: ${result.success.length} success, ${result.failed.length} failed`);
      return result;
    } catch (error) {
      console.error('Error sending important info:', error);
      return { success: [], failed: userIds };
    }
  }

  /**
   * 檢查使用者好友狀態
   */
  async checkUserFriendshipStatus(userId: string): Promise<{
    isFriend: boolean;
    canSendMessage: boolean;
    guidanceMessage?: string;
  }> {
    try {
      const status = await lineMessagingService.checkFriendshipStatus(userId);
      
      return {
        isFriend: status.isFriend,
        canSendMessage: status.canSendMessage,
        guidanceMessage: status.isFriend ? undefined : lineMessagingService.createFriendRequestGuidance(),
      };
    } catch (error) {
      console.error('Error checking friendship status:', error);
      return {
        isFriend: false,
        canSendMessage: false,
        guidanceMessage: lineMessagingService.createFriendRequestGuidance(),
      };
    }
  }

  /**
   * 為特定活動發送批量提醒
   */
  async sendEventRemindersForEvent(
    eventId: string,
    reminderType: 'day_before' | 'hour_before'
  ): Promise<{ success: number; failed: number }> {
    try {
      // 這裡應該從資料庫獲取活動和報名資料
      // 目前使用 API 呼叫模擬
      const eventResponse = await apiClient.get(`/api/v1/events/${eventId}`);
      if (!eventResponse.success) {
        throw new Error('Failed to fetch event data');
      }

      const event = eventResponse.data;
      
      // 獲取該活動的所有報名記錄
      const registrationsResponse = await apiClient.get(`/api/v1/events/${eventId}/registrations`);
      if (!registrationsResponse.success) {
        throw new Error('Failed to fetch registrations');
      }

      const registrations = registrationsResponse.data;
      
      let successCount = 0;
      let failedCount = 0;

      // 為每個報名者發送提醒
      for (const registration of registrations) {
        try {
          // 獲取使用者資料
          const userResponse = await apiClient.get(`/api/v1/user/profile?userId=${registration.userId}`);
          if (!userResponse.success) {
            failedCount++;
            continue;
          }

          const user = userResponse.data;
          
          const success = await this.sendEventReminder(user, registration, event, reminderType);
          if (success) {
            successCount++;
          } else {
            failedCount++;
          }
        } catch (error) {
          console.error(`Error sending reminder to user ${registration.userId}:`, error);
          failedCount++;
        }
      }

      console.log(`Event reminders sent for event ${eventId}: ${successCount} success, ${failedCount} failed`);
      return { success: successCount, failed: failedCount };
    } catch (error) {
      console.error('Error sending event reminders:', error);
      throw error;
    }
  }

  /**
   * 發送交通車資訊更新通知
   */
  async sendTransportInfoUpdate(
    eventId: string,
    transportLocationId: string,
    updateMessage: string
  ): Promise<{ success: number; failed: number }> {
    try {
      // 獲取該交通車地點的所有報名者
      const registrationsResponse = await apiClient.get(
        `/api/v1/events/${eventId}/registrations?transportLocationId=${transportLocationId}`
      );
      
      if (!registrationsResponse.success) {
        throw new Error('Failed to fetch transport registrations');
      }

      const registrations = registrationsResponse.data;
      const userIds = registrations.map((reg: Registration) => reg.userId);

      if (userIds.length === 0) {
        return { success: 0, failed: 0 };
      }

      const result = await this.sendImportantInfo(
        userIds,
        '交通車資訊更新',
        updateMessage
      );

      return {
        success: result.success.length,
        failed: result.failed.length,
      };
    } catch (error) {
      console.error('Error sending transport info update:', error);
      throw error;
    }
  }

  /**
   * 發送活動取消通知
   */
  async sendEventCancellationNotice(
    eventId: string,
    reason: string
  ): Promise<{ success: number; failed: number }> {
    try {
      // 獲取該活動的所有報名記錄
      const registrationsResponse = await apiClient.get(`/api/v1/events/${eventId}/registrations`);
      if (!registrationsResponse.success) {
        throw new Error('Failed to fetch registrations');
      }

      const registrations = registrationsResponse.data;
      const userIds = registrations.map((reg: Registration) => reg.userId);

      if (userIds.length === 0) {
        return { success: 0, failed: 0 };
      }

      const eventResponse = await apiClient.get(`/api/v1/events/${eventId}`);
      const eventName = eventResponse.success ? eventResponse.data.name : '活動';

      const result = await this.sendImportantInfo(
        userIds,
        '活動取消通知',
        `很抱歉通知您，「${eventName}」因為${reason}而取消。如有任何問題，請聯繫我們。`,
        `${process.env.NEXT_PUBLIC_LIFF_URL}/events/${eventId}`
      );

      return {
        success: result.success.length,
        failed: result.failed.length,
      };
    } catch (error) {
      console.error('Error sending event cancellation notice:', error);
      throw error;
    }
  }
}

// 建立全域服務實例
export const notificationService = new NotificationService();
export default notificationService;