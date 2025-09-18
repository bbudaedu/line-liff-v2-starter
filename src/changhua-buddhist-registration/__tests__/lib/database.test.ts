/**
 * 資料庫模型單元測試
 * Database models unit tests
 */

import { db, User, Event, Registration, TransportOption } from '../../lib/database';

describe('Database Models', () => {
  beforeEach(async () => {
    await db.clearAll();
  });

  describe('User Operations', () => {
    const mockUser: Omit<User, 'createdAt' | 'updatedAt'> = {
      lineUserId: 'test-user-123',
      displayName: '測試使用者',
      pictureUrl: 'https://example.com/avatar.jpg',
      identity: 'volunteer',
      phone: '0912345678',
      emergencyContact: '0987654321',
    };

    test('should create a new user', async () => {
      const user = await db.createUser(mockUser);
      
      expect(user).toMatchObject(mockUser);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    test('should get user by LINE ID', async () => {
      await db.createUser(mockUser);
      const user = await db.getUserByLineId(mockUser.lineUserId);
      
      expect(user).toMatchObject(mockUser);
    });

    test('should return null for non-existent user', async () => {
      const user = await db.getUserByLineId('non-existent');
      expect(user).toBeNull();
    });

    test('should update user', async () => {
      await db.createUser(mockUser);
      const updatedUser = await db.updateUser(mockUser.lineUserId, {
        identity: 'monk',
        templeName: '測試寺院',
      });
      
      expect(updatedUser?.identity).toBe('monk');
      expect(updatedUser?.templeName).toBe('測試寺院');
      expect(updatedUser?.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Event Operations', () => {
    const mockEvent: Omit<Event, 'id'> = {
      name: '測試活動',
      description: '這是一個測試活動',
      startDate: new Date('2024-12-01T08:00:00Z'),
      endDate: new Date('2024-12-01T17:00:00Z'),
      location: '測試地點',
      maxParticipants: 100,
      currentParticipants: 0,
      registrationDeadline: new Date('2024-11-25T23:59:59Z'),
      status: 'open',
      pretixEventSlug: 'test-event',
      transportOptions: [],
    };

    test('should create a new event', async () => {
      const event = await db.createEvent(mockEvent);
      
      expect(event).toMatchObject(mockEvent);
      expect(event.id).toBeDefined();
      expect(typeof event.id).toBe('string');
    });

    test('should get all events', async () => {
      await db.createEvent(mockEvent);
      await db.createEvent({ ...mockEvent, name: '另一個測試活動' });
      
      const events = await db.getEvents();
      expect(events).toHaveLength(2);
    });

    test('should get event by ID', async () => {
      const createdEvent = await db.createEvent(mockEvent);
      const event = await db.getEventById(createdEvent.id);
      
      expect(event).toMatchObject(mockEvent);
    });

    test('should update event', async () => {
      const createdEvent = await db.createEvent(mockEvent);
      const updatedEvent = await db.updateEvent(createdEvent.id, {
        status: 'full',
        currentParticipants: 100,
      });
      
      expect(updatedEvent?.status).toBe('full');
      expect(updatedEvent?.currentParticipants).toBe(100);
    });
  });

  describe('Registration Operations', () => {
    let userId: string;
    let eventId: string;

    beforeEach(async () => {
      const user = await db.createUser({
        lineUserId: 'test-user-123',
        displayName: '測試使用者',
        identity: 'volunteer',
      });
      userId = user.lineUserId;

      const event = await db.createEvent({
        name: '測試活動',
        description: '測試活動描述',
        startDate: new Date('2024-12-01T08:00:00Z'),
        endDate: new Date('2024-12-01T17:00:00Z'),
        location: '測試地點',
        maxParticipants: 100,
        currentParticipants: 0,
        registrationDeadline: new Date('2024-11-25T23:59:59Z'),
        status: 'open',
        pretixEventSlug: 'test-event',
        transportOptions: [],
      });
      eventId = event.id;
    });

    const mockRegistration: Omit<Registration, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: '',
      eventId: '',
      identity: 'volunteer',
      personalInfo: {
        name: '測試使用者',
        phone: '0912345678',
        emergencyContact: '0987654321',
        specialRequirements: '素食',
      },
      transport: {
        required: true,
        locationId: 'transport-1',
        pickupTime: new Date('2024-12-01T07:30:00Z'),
      },
      status: 'pending',
    };

    test('should create a new registration', async () => {
      const registrationData = {
        ...mockRegistration,
        userId,
        eventId,
      };

      const registration = await db.createRegistration(registrationData);
      
      expect(registration).toMatchObject(registrationData);
      expect(registration.id).toBeDefined();
      expect(registration.createdAt).toBeInstanceOf(Date);
      expect(registration.updatedAt).toBeInstanceOf(Date);
    });

    test('should get registrations by user ID', async () => {
      await db.createRegistration({
        ...mockRegistration,
        userId,
        eventId,
      });

      const registrations = await db.getRegistrationsByUserId(userId);
      expect(registrations).toHaveLength(1);
      expect(registrations[0].userId).toBe(userId);
    });

    test('should get registrations by event ID', async () => {
      await db.createRegistration({
        ...mockRegistration,
        userId,
        eventId,
      });

      const registrations = await db.getRegistrationsByEventId(eventId);
      expect(registrations).toHaveLength(1);
      expect(registrations[0].eventId).toBe(eventId);
    });

    test('should update registration status', async () => {
      const registration = await db.createRegistration({
        ...mockRegistration,
        userId,
        eventId,
      });

      const updatedRegistration = await db.updateRegistration(registration.id, {
        status: 'confirmed',
        pretixOrderId: 'ORDER-123',
      });

      expect(updatedRegistration?.status).toBe('confirmed');
      expect(updatedRegistration?.pretixOrderId).toBe('ORDER-123');
    });
  });

  describe('Transport Operations', () => {
    let eventId: string;

    beforeEach(async () => {
      const event = await db.createEvent({
        name: '測試活動',
        description: '測試活動描述',
        startDate: new Date('2024-12-01T08:00:00Z'),
        endDate: new Date('2024-12-01T17:00:00Z'),
        location: '測試地點',
        maxParticipants: 100,
        currentParticipants: 0,
        registrationDeadline: new Date('2024-11-25T23:59:59Z'),
        status: 'open',
        pretixEventSlug: 'test-event',
        transportOptions: [],
      });
      eventId = event.id;
    });

    const mockTransport: Omit<TransportOption, 'id'> = {
      eventId: '',
      name: '測試車站',
      address: '測試地址123號',
      pickupTime: new Date('2024-12-01T07:30:00Z'),
      maxSeats: 45,
      bookedSeats: 0,
      coordinates: { lat: 24.0818, lng: 120.5387 },
    };

    test('should create transport option', async () => {
      const transportData = { ...mockTransport, eventId };
      const transport = await db.createTransportOption(transportData);
      
      expect(transport).toMatchObject(transportData);
      expect(transport.id).toBeDefined();
    });

    test('should get transport options by event ID', async () => {
      await db.createTransportOption({ ...mockTransport, eventId });
      await db.createTransportOption({ 
        ...mockTransport, 
        eventId, 
        name: '另一個車站' 
      });

      const transports = await db.getTransportOptionsByEventId(eventId);
      expect(transports).toHaveLength(2);
    });

    test('should update transport option', async () => {
      const transport = await db.createTransportOption({ ...mockTransport, eventId });
      const updatedTransport = await db.updateTransportOption(transport.id, {
        bookedSeats: 10,
      });

      expect(updatedTransport?.bookedSeats).toBe(10);
    });
  });
});