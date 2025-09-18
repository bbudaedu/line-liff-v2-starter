// 使用者相關類型定義
export interface User {
  lineUserId: string;
  displayName: string;
  pictureUrl?: string;
  identity: 'monk' | 'volunteer';
  phone?: string;
  emergencyContact?: string; // 志工專用
  templeName?: string;       // 法師專用
  createdAt: Date;
  updatedAt: Date;
}

// 活動相關類型定義
export interface Event {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: string;
  maxParticipants: number;
  currentParticipants: number;
  registrationDeadline: Date;
  status: 'open' | 'closed' | 'full';
  pretixEventSlug: string;
  transportOptions: TransportOption[];
}

// 交通車選項類型定義
export interface TransportOption {
  id: string;
  eventId: string;
  name: string;
  address: string;
  pickupTime: Date;
  maxSeats: number;
  bookedSeats: number;
  coordinates: {
    lat: number;
    lng: number;
  };
}

// 報名狀態類型定義
export type RegistrationStatus = 'pending' | 'confirmed' | 'cancelled';

// 報名資料類型定義
export interface Registration {
  id: string;
  userId: string;
  eventId: string;
  identity: 'monk' | 'volunteer';
  personalInfo: {
    name: string;
    phone: string;
    emergencyContact?: string; // 志工專用
    templeName?: string;       // 法師專用
    specialRequirements?: string;
  };
  transport: {
    required: boolean;
    locationId?: string;
    pickupTime?: Date;
  };
  pretixOrderId?: string;
  status: RegistrationStatus;
  createdAt: Date;
  updatedAt: Date;
}

// LIFF 相關類型定義
export interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

// API 回應類型定義
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
  timestamp: string;
}

// 表單驗證錯誤類型
export interface FormErrors {
  [key: string]: string;
}

// 載入狀態類型
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

// 錯誤狀態類型
export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
}

// Pretix API 相關類型
export interface PretixEvent {
  slug: string;
  name: {
    'zh-tw': string;
    en: string;
  };
  date_from: string;
  date_to: string;
  location: string;
  live: boolean;
}

export interface PretixItem {
  id: number;
  name: {
    'zh-tw': string;
    en: string;
  };
  category: string;
  active: boolean;
  available_from?: string;
  available_until?: string;
}

export interface PretixOrder {
  code: string;
  status: 'n' | 'p' | 'e' | 'c' | 'r';
  email: string;
  phone?: string;
  datetime: string;
  positions: PretixOrderPosition[];
}

export interface PretixOrderPosition {
  id: number;
  item: number;
  variation?: number;
  attendee_name?: string;
  attendee_email?: string;
}

// 元件 Props 類型定義
export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  type?: 'text' | 'tel' | 'email';
  className?: string;
}

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

// 頁面 Props 類型定義
export interface PageProps {
  className?: string;
  liffProfile?: LiffProfile;
  isInLineClient?: boolean;
}

// 路由參數類型定義
export interface EventPageParams {
  eventId: string;
}

export interface RegistrationPageParams {
  eventId: string;
  step?: string;
}

// LINE 訊息相關類型定義
export interface LineMessageTemplate {
  type: 'registration_success' | 'event_reminder' | 'transport_info' | 'friend_request';
  data: any;
}

export interface LineFriendshipStatus {
  isFriend: boolean;
  canSendMessage: boolean;
  guidanceMessage?: string;
}

export interface LineNotificationRequest {
  userId: string;
  type: 'registration_success' | 'event_reminder' | 'important_info';
  data: any;
}

export interface LineBulkNotificationRequest {
  userIds: string[];
  messageTemplate: LineMessageTemplate;
}

export interface LineReminderRequest {
  eventId?: string;
  reminderType: 'day_before' | 'hour_before';
  authToken?: string;
}