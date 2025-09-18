/**
 * 資料庫連接和模型定義
 * Database connection and model definitions
 */

// 簡化的記憶體資料庫實作（開發用）
// Simplified in-memory database implementation (for development)

export interface User {
  lineUserId: string;
  displayName: string;
  pictureUrl?: string;
  identity: 'monk' | 'volunteer';
  phone?: string;
  emergencyContact?: string; // 志工專用
  templeName?: string; // 法師專用
  createdAt: Date;
  updatedAt: Date;
}

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

export interface Registration {
  id: string;
  userId: string;
  eventId: string;
  identity: 'monk' | 'volunteer';
  personalInfo: {
    name: string;
    phone: string;
    email?: string;
    emergencyContact?: string;
    templeName?: string;
    specialRequirements?: string;
  };
  transport?: {
    required: boolean;
    locationId?: string;
    pickupTime?: Date;
  };
  pretixOrderId?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  metadata?: {
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface RegistrationHistory {
  id: string;
  registrationId: string;
  userId: string;
  action: 'created' | 'updated' | 'cancelled';
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  reason?: string;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    requestId?: string;
    [key: string]: any;
  };
  createdAt: Date;
}

export interface TransportOption {
  id: string;
  eventId: string;
  name: string;
  address: string;
  pickupTime: Date;
  maxSeats: number;
  bookedSeats: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

// 記憶體資料庫儲存
// In-memory database storage
class MemoryDatabase {
  private users: Map<string, User> = new Map();
  private events: Map<string, Event> = new Map();
  private registrations: Map<string, Registration> = new Map();
  private transportOptions: Map<string, TransportOption> = new Map();
  private registrationHistory: Map<string, RegistrationHistory> = new Map();

  // User operations
  async createUser(user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> {
    const newUser: User = {
      ...user,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.lineUserId, newUser);
    return newUser;
  }

  async getUserByLineId(lineUserId: string): Promise<User | null> {
    return this.users.get(lineUserId) || null;
  }

  async updateUser(lineUserId: string, updates: Partial<User>): Promise<User | null> {
    const user = this.users.get(lineUserId);
    if (!user) return null;

    const updatedUser: User = {
      ...user,
      ...updates,
      updatedAt: new Date(),
    };
    this.users.set(lineUserId, updatedUser);
    return updatedUser;
  }

  // Event operations
  async createEvent(event: Omit<Event, 'id'>): Promise<Event> {
    const id = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newEvent: Event = { ...event, id };
    this.events.set(id, newEvent);
    return newEvent;
  }

  async getEvents(): Promise<Event[]> {
    return Array.from(this.events.values());
  }

  async getEventById(id: string): Promise<Event | null> {
    return this.events.get(id) || null;
  }

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event | null> {
    const event = this.events.get(id);
    if (!event) return null;

    const updatedEvent: Event = { ...event, ...updates };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }

  // Registration operations
  async createRegistration(registration: Omit<Registration, 'id' | 'createdAt' | 'updatedAt'>): Promise<Registration> {
    const id = `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newRegistration: Registration = {
      ...registration,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.registrations.set(id, newRegistration);
    return newRegistration;
  }

  async getRegistrationById(id: string): Promise<Registration | null> {
    return this.registrations.get(id) || null;
  }

  async getRegistrationsByUserId(userId: string): Promise<Registration[]> {
    return Array.from(this.registrations.values()).filter(reg => reg.userId === userId);
  }

  async getRegistrationsByEventId(eventId: string): Promise<Registration[]> {
    return Array.from(this.registrations.values()).filter(reg => reg.eventId === eventId);
  }

  async updateRegistration(id: string, updates: Partial<Registration>, historyMetadata?: any): Promise<Registration | null> {
    const registration = this.registrations.get(id);
    if (!registration) return null;

    // 記錄變更歷史
    const changes: { field: string; oldValue: any; newValue: any }[] = [];
    
    Object.keys(updates).forEach(key => {
      if (key !== 'updatedAt' && updates[key] !== registration[key]) {
        changes.push({
          field: key,
          oldValue: registration[key],
          newValue: updates[key]
        });
      }
    });

    if (changes.length > 0) {
      await this.createRegistrationHistory({
        registrationId: id,
        userId: registration.userId,
        action: updates.status === 'cancelled' ? 'cancelled' : 'updated',
        changes,
        metadata: historyMetadata
      });
    }

    const updatedRegistration: Registration = {
      ...registration,
      ...updates,
      updatedAt: new Date(),
    };
    this.registrations.set(id, updatedRegistration);
    return updatedRegistration;
  }

  // Transport operations
  async createTransportOption(transport: Omit<TransportOption, 'id'>): Promise<TransportOption> {
    const id = `transport_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newTransport: TransportOption = { ...transport, id };
    this.transportOptions.set(id, newTransport);
    return newTransport;
  }

  async getTransportOptionsByEventId(eventId: string): Promise<TransportOption[]> {
    return Array.from(this.transportOptions.values()).filter(transport => transport.eventId === eventId);
  }

  async getTransportOptionById(id: string): Promise<TransportOption | null> {
    return this.transportOptions.get(id) || null;
  }

  async updateTransportOption(id: string, updates: Partial<TransportOption>): Promise<TransportOption | null> {
    const transport = this.transportOptions.get(id);
    if (!transport) return null;

    const updatedTransport: TransportOption = { ...transport, ...updates };
    this.transportOptions.set(id, updatedTransport);
    return updatedTransport;
  }

  // Registration History operations
  async createRegistrationHistory(history: Omit<RegistrationHistory, 'id' | 'createdAt'>): Promise<RegistrationHistory> {
    const id = `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newHistory: RegistrationHistory = {
      ...history,
      id,
      createdAt: new Date(),
    };
    this.registrationHistory.set(id, newHistory);
    return newHistory;
  }

  async getRegistrationHistory(registrationId: string): Promise<RegistrationHistory[]> {
    return Array.from(this.registrationHistory.values())
      .filter(history => history.registrationId === registrationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getRegistrationHistoryByUserId(userId: string): Promise<RegistrationHistory[]> {
    return Array.from(this.registrationHistory.values())
      .filter(history => history.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // 檢查修改權限和時間限制
  async canModifyRegistration(registrationId: string): Promise<{ canModify: boolean; reason?: string }> {
    const registration = await this.getRegistrationById(registrationId);
    if (!registration) {
      return { canModify: false, reason: '找不到報名記錄' };
    }

    if (registration.status === 'cancelled') {
      return { canModify: false, reason: '已取消的報名無法修改' };
    }

    // 檢查是否在活動開始前3天
    const event = await this.getEventById(registration.eventId);
    if (event) {
      const threeDaysBeforeEvent = new Date(event.startDate.getTime() - 3 * 24 * 60 * 60 * 1000);
      const now = new Date();
      
      if (now > threeDaysBeforeEvent) {
        return { canModify: false, reason: '活動開始前3天內無法修改報名資料' };
      }
    }

    // 檢查修改次數限制（最多允許修改5次）
    const history = await this.getRegistrationHistory(registrationId);
    const updateCount = history.filter(h => h.action === 'updated').length;
    
    if (updateCount >= 5) {
      return { canModify: false, reason: '已達到最大修改次數限制（5次）' };
    }

    return { canModify: true };
  }

  // 清理方法（測試用）
  async clearAll(): Promise<void> {
    this.users.clear();
    this.events.clear();
    this.registrations.clear();
    this.transportOptions.clear();
    this.registrationHistory.clear();
  }
}

// 單例資料庫實例
export const db = new MemoryDatabase();

// 初始化測試資料
export async function initializeTestData(): Promise<void> {
  // 建立測試活動
  const testEvent = await db.createEvent({
    name: '2024年彰化供佛齋僧活動',
    description: '歡迎法師和志工參與供佛齋僧活動',
    startDate: new Date('2024-12-01T08:00:00Z'),
    endDate: new Date('2024-12-01T17:00:00Z'),
    location: '彰化縣彰化市中山路一段123號',
    maxParticipants: 150,
    currentParticipants: 0,
    registrationDeadline: new Date('2024-11-25T23:59:59Z'),
    status: 'open',
    pretixEventSlug: 'changhua-buddhist-2024',
    transportOptions: [],
  });

  // 建立交通車選項
  await db.createTransportOption({
    eventId: testEvent.id,
    name: '彰化火車站',
    address: '彰化縣彰化市三民路1號',
    pickupTime: new Date('2024-12-01T07:30:00Z'),
    maxSeats: 45,
    bookedSeats: 0,
    coordinates: { lat: 24.0818, lng: 120.5387 },
  });

  await db.createTransportOption({
    eventId: testEvent.id,
    name: '員林轉運站',
    address: '彰化縣員林市中山路二段556號',
    pickupTime: new Date('2024-12-01T08:00:00Z'),
    maxSeats: 45,
    bookedSeats: 0,
    coordinates: { lat: 23.9588, lng: 120.5667 },
  });
}