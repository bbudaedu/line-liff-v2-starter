// LIFF SDK 類型定義
declare global {
  interface Window {
    liff: any;
  }
}

// LIFF 相關類型定義
export interface LiffConfig {
  liffId: string;
}

export interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export interface LiffContext {
  type: 'utou' | 'room' | 'group' | 'square_chat' | 'external';
  viewType: 'compact' | 'tall' | 'full';
  userId?: string;
  utouId?: string;
  roomId?: string;
  groupId?: string;
  squareChatId?: string;
}

export interface LiffPermission {
  state: 'granted' | 'prompt' | 'unavailable';
}

export interface LiffFriendship {
  friendFlag: boolean;
}

export interface LiffError {
  code: string;
  message: string;
}

export interface LiffDecodedIDToken {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  amr: string[];
  name: string;
  picture?: string;
  email?: string;
}

// LIFF SDK 方法定義
declare namespace liff {
  function init(config: LiffConfig): Promise<void>;
  function ready(): Promise<void>;
  
  // 環境資訊
  function getOS(): 'ios' | 'android' | 'web';
  function getLanguage(): string;
  function getVersion(): string;
  function getLineVersion(): string;
  function isInClient(): boolean;
  function isLoggedIn(): boolean;
  function isApiAvailable(apiName: string): boolean;
  
  // 使用者資訊
  function getProfile(): Promise<LiffProfile>;
  function getContext(): LiffContext;
  function getIDToken(): string;
  function getDecodedIDToken(): LiffDecodedIDToken;
  function getAccessToken(): string;
  function getFriendship(): Promise<LiffFriendship>;
  
  // 權限管理
  namespace permission {
    function query(permission: string): Promise<LiffPermission>;
    function requestAll(): Promise<LiffPermission[]>;
    function getGrantedAll(): Promise<string[]>;
  }
  
  // 認證
  function login(options?: { redirectUri?: string }): void;
  function logout(): void;
  
  // 視窗操作
  function openWindow(options: {
    url: string;
    external?: boolean;
  }): void;
  function closeWindow(): void;
  
  // 訊息發送
  function sendMessages(messages: any[]): Promise<void>;
  function shareTargetPicker(options: any): Promise<void>;
  
  // 掃描功能
  function scanCode(): Promise<{ value: string }>;
  function scanCodeV2(options?: any): Promise<{ value: string }>;
  
  // 永久連結
  namespace permanentLink {
    function createUrl(): string;
    function createUrlBy(data: any): string;
    function setExtraQueryParam(param: string): void;
  }
  
  // 插件系統
  function use(plugin: any): void;
  
  // 其他功能
  function createShortcutOnHomeScreen(options: any): Promise<void>;
}

export default liff;