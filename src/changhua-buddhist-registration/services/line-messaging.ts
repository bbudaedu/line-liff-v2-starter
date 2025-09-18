import { Client, ClientConfig, Message, TextMessage, FlexMessage, FlexBubble } from '@line/bot-sdk';
import { Registration, Event, TransportOption } from '@/types';
import { getEnvVar } from '@/utils/helpers';

/**
 * LINE 訊息模板類型
 */
export interface MessageTemplate {
  type: 'registration_success' | 'event_reminder' | 'transport_info' | 'friend_request';
  data: any;
}

/**
 * LINE 好友狀態
 */
export interface FriendshipStatus {
  isFriend: boolean;
  canSendMessage: boolean;
}

/**
 * LINE 訊息通知服務
 */
export class LineMessagingService {
  private client: Client;
  private channelAccessToken: string;
  private channelSecret: string;

  constructor() {
    this.channelAccessToken = getEnvVar('LINE_CHANNEL_ACCESS_TOKEN', '');
    this.channelSecret = getEnvVar('LINE_CHANNEL_SECRET', '');

    if (!this.channelAccessToken || !this.channelSecret) {
      throw new Error('LINE Channel credentials are required');
    }

    const config: ClientConfig = {
      channelAccessToken: this.channelAccessToken,
      channelSecret: this.channelSecret,
    };

    this.client = new Client(config);
  }

  /**
   * 檢查使用者好友狀態
   */
  async checkFriendshipStatus(userId: string): Promise<FriendshipStatus> {
    try {
      const profile = await this.client.getProfile(userId);
      return {
        isFriend: true,
        canSendMessage: true,
      };
    } catch (error: any) {
      console.error('Error checking friendship status:', error);
      
      // 如果是 403 錯誤，表示不是好友
      if (error.statusCode === 403) {
        return {
          isFriend: false,
          canSendMessage: false,
        };
      }
      
      throw error;
    }
  }

  /**
   * 發送報名成功通知
   */
  async sendRegistrationSuccessNotification(
    userId: string,
    registration: Registration,
    event: Event
  ): Promise<void> {
    try {
      const friendshipStatus = await this.checkFriendshipStatus(userId);
      
      if (!friendshipStatus.canSendMessage) {
        console.warn(`Cannot send message to user ${userId}: not a friend`);
        return;
      }

      const message = this.createRegistrationSuccessMessage(registration, event);
      await this.client.pushMessage(userId, message);
      
      console.log(`Registration success notification sent to user ${userId}`);
    } catch (error) {
      console.error('Error sending registration success notification:', error);
      throw error;
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
  ): Promise<void> {
    try {
      const friendshipStatus = await this.checkFriendshipStatus(userId);
      
      if (!friendshipStatus.canSendMessage) {
        console.warn(`Cannot send reminder to user ${userId}: not a friend`);
        return;
      }

      const message = this.createEventReminderMessage(registration, event, reminderType);
      await this.client.pushMessage(userId, message);
      
      console.log(`Event reminder sent to user ${userId} (${reminderType})`);
    } catch (error) {
      console.error('Error sending event reminder:', error);
      throw error;
    }
  }

  /**
   * 發送重要資訊推送
   */
  async sendImportantInfo(
    userId: string,
    title: string,
    content: string,
    actionUrl?: string
  ): Promise<void> {
    try {
      const friendshipStatus = await this.checkFriendshipStatus(userId);
      
      if (!friendshipStatus.canSendMessage) {
        console.warn(`Cannot send important info to user ${userId}: not a friend`);
        return;
      }

      const message = this.createImportantInfoMessage(title, content, actionUrl);
      await this.client.pushMessage(userId, message);
      
      console.log(`Important info sent to user ${userId}`);
    } catch (error) {
      console.error('Error sending important info:', error);
      throw error;
    }
  }

  /**
   * 建立報名成功訊息
   */
  private createRegistrationSuccessMessage(
    registration: Registration,
    event: Event
  ): FlexMessage {
    const transportInfo = registration.transport.required && registration.transport.locationId
      ? event.transportOptions.find(t => t.id === registration.transport.locationId)
      : null;

    const bubble: FlexBubble = {
      type: 'bubble',
      hero: {
        type: 'image',
        url: 'https://via.placeholder.com/400x200/7B4397/FFFFFF?text=報名成功',
        size: 'full',
        aspectRatio: '20:10',
        aspectMode: 'cover',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🎉 報名成功！',
            weight: 'bold',
            size: 'xl',
            color: '#7B4397',
          },
          {
            type: 'separator',
            margin: 'md',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            contents: [
              {
                type: 'box',
                layout: 'baseline',
                contents: [
                  {
                    type: 'text',
                    text: '活動名稱',
                    color: '#666666',
                    size: 'sm',
                    flex: 2,
                  },
                  {
                    type: 'text',
                    text: event.name,
                    wrap: true,
                    color: '#333333',
                    size: 'sm',
                    flex: 5,
                  },
                ],
              },
              {
                type: 'box',
                layout: 'baseline',
                margin: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '活動時間',
                    color: '#666666',
                    size: 'sm',
                    flex: 2,
                  },
                  {
                    type: 'text',
                    text: new Date(event.startDate).toLocaleDateString('zh-TW', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'long',
                    }),
                    wrap: true,
                    color: '#333333',
                    size: 'sm',
                    flex: 5,
                  },
                ],
              },
              {
                type: 'box',
                layout: 'baseline',
                margin: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '活動地點',
                    color: '#666666',
                    size: 'sm',
                    flex: 2,
                  },
                  {
                    type: 'text',
                    text: event.location,
                    wrap: true,
                    color: '#333333',
                    size: 'sm',
                    flex: 5,
                  },
                ],
              },
              {
                type: 'box',
                layout: 'baseline',
                margin: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: '報名身份',
                    color: '#666666',
                    size: 'sm',
                    flex: 2,
                  },
                  {
                    type: 'text',
                    text: registration.identity === 'monk' ? '法師' : '志工',
                    wrap: true,
                    color: '#333333',
                    size: 'sm',
                    flex: 5,
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    // 如果有交通車資訊，加入交通車詳情
    if (transportInfo) {
      bubble.body?.contents.push(
        {
          type: 'separator',
          margin: 'md',
        },
        {
          type: 'text',
          text: '🚌 交通車資訊',
          weight: 'bold',
          color: '#7B4397',
          margin: 'md',
        },
        {
          type: 'box',
          layout: 'vertical',
          margin: 'sm',
          contents: [
            {
              type: 'box',
              layout: 'baseline',
              contents: [
                {
                  type: 'text',
                  text: '上車地點',
                  color: '#666666',
                  size: 'sm',
                  flex: 2,
                },
                {
                  type: 'text',
                  text: transportInfo.name,
                  wrap: true,
                  color: '#333333',
                  size: 'sm',
                  flex: 5,
                },
              ],
            },
            {
              type: 'box',
              layout: 'baseline',
              margin: 'sm',
              contents: [
                {
                  type: 'text',
                  text: '上車時間',
                  color: '#666666',
                  size: 'sm',
                  flex: 2,
                },
                {
                  type: 'text',
                  text: new Date(transportInfo.pickupTime).toLocaleTimeString('zh-TW', {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                  wrap: true,
                  color: '#333333',
                  size: 'sm',
                  flex: 5,
                },
              ],
            },
            {
              type: 'box',
              layout: 'baseline',
              margin: 'sm',
              contents: [
                {
                  type: 'text',
                  text: '地址',
                  color: '#666666',
                  size: 'sm',
                  flex: 2,
                },
                {
                  type: 'text',
                  text: transportInfo.address,
                  wrap: true,
                  color: '#333333',
                  size: 'sm',
                  flex: 5,
                },
              ],
            },
          ],
        }
      );
    }

    // 加入底部按鈕
    bubble.footer = {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          style: 'primary',
          height: 'sm',
          action: {
            type: 'uri',
            label: '查看報名詳情',
            uri: `${getEnvVar('NEXT_PUBLIC_LIFF_URL', '')}/registrations/${registration.id}`,
          },
          color: '#7B4397',
        },
      ],
    };

    return {
      type: 'flex',
      altText: `報名成功通知 - ${event.name}`,
      contents: bubble,
    };
  }

  /**
   * 建立活動提醒訊息
   */
  private createEventReminderMessage(
    registration: Registration,
    event: Event,
    reminderType: 'day_before' | 'hour_before'
  ): TextMessage {
    const reminderTitle = reminderType === 'day_before' ? '明日活動提醒' : '活動即將開始';
    const timeInfo = reminderType === 'day_before' 
      ? '明天' 
      : '1小時後';

    let message = `🔔 ${reminderTitle}\n\n`;
    message += `📅 活動名稱：${event.name}\n`;
    message += `⏰ 活動時間：${timeInfo} ${new Date(event.startDate).toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
    })}\n`;
    message += `📍 活動地點：${event.location}\n`;

    // 如果有交通車資訊
    if (registration.transport.required && registration.transport.locationId) {
      const transportInfo = event.transportOptions.find(t => t.id === registration.transport.locationId);
      if (transportInfo) {
        message += `\n🚌 交通車資訊：\n`;
        message += `   上車地點：${transportInfo.name}\n`;
        message += `   上車時間：${new Date(transportInfo.pickupTime).toLocaleTimeString('zh-TW', {
          hour: '2-digit',
          minute: '2-digit',
        })}\n`;
        message += `   地址：${transportInfo.address}\n`;
      }
    }

    message += `\n請準時參加，阿彌陀佛 🙏`;

    return {
      type: 'text',
      text: message,
    };
  }

  /**
   * 建立重要資訊訊息
   */
  private createImportantInfoMessage(
    title: string,
    content: string,
    actionUrl?: string
  ): Message {
    if (actionUrl) {
      const bubble: FlexBubble = {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `📢 ${title}`,
              weight: 'bold',
              size: 'lg',
              color: '#DC2430',
            },
            {
              type: 'separator',
              margin: 'md',
            },
            {
              type: 'text',
              text: content,
              wrap: true,
              margin: 'md',
              color: '#333333',
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: {
                type: 'uri',
                label: '查看詳情',
                uri: actionUrl,
              },
              color: '#DC2430',
            },
          ],
        },
      };

      return {
        type: 'flex',
        altText: `重要通知 - ${title}`,
        contents: bubble,
      };
    } else {
      return {
        type: 'text',
        text: `📢 ${title}\n\n${content}`,
      };
    }
  }

  /**
   * 建立加好友引導訊息（用於 Rich Menu 或其他地方）
   */
  createFriendRequestGuidance(): string {
    return '為了接收活動通知和重要資訊，請先加入我們的官方帳號為好友。點擊下方按鈕即可加入！';
  }

  /**
   * 批量發送訊息
   */
  async sendBulkMessages(
    userIds: string[],
    messageTemplate: MessageTemplate
  ): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    for (const userId of userIds) {
      try {
        switch (messageTemplate.type) {
          case 'registration_success':
            await this.sendRegistrationSuccessNotification(
              userId,
              messageTemplate.data.registration,
              messageTemplate.data.event
            );
            break;
          case 'event_reminder':
            await this.sendEventReminder(
              userId,
              messageTemplate.data.registration,
              messageTemplate.data.event,
              messageTemplate.data.reminderType
            );
            break;
          case 'transport_info':
            await this.sendImportantInfo(
              userId,
              messageTemplate.data.title,
              messageTemplate.data.content,
              messageTemplate.data.actionUrl
            );
            break;
          default:
            throw new Error(`Unknown message template type: ${messageTemplate.type}`);
        }
        success.push(userId);
      } catch (error) {
        console.error(`Failed to send message to user ${userId}:`, error);
        failed.push(userId);
      }
    }

    return { success, failed };
  }
}

// 建立全域服務實例（僅在非測試環境）
let _lineMessagingService: LineMessagingService | null = null;

export const getLineMessagingService = (): LineMessagingService => {
  if (!_lineMessagingService) {
    _lineMessagingService = new LineMessagingService();
  }
  return _lineMessagingService;
};

// 只在非測試環境建立全域實例
export const lineMessagingService = process.env.NODE_ENV === 'test' 
  ? {} as LineMessagingService 
  : getLineMessagingService();

export default lineMessagingService;