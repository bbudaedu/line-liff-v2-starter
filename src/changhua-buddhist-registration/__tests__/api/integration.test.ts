/**
 * API 整合測試
 * API Integration tests
 */

import { db, initializeTestData } from '../../lib/database';

describe('API Integration', () => {
  beforeEach(async () => {
    await db.clearAll();
    await initializeTestData();
  });

  test('should initialize test data correctly', async () => {
    const events = await db.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe('2024年彰化供佛齋僧活動');

    const transportOptions = await db.getTransportOptionsByEventId(events[0].id);
    expect(transportOptions).toHaveLength(2);
    expect(transportOptions[0].name).toBe('彰化火車站');
    expect(transportOptions[1].name).toBe('員林轉運站');
  });

  test('should handle complete user registration flow', async () => {
    // 1. Create user
    const user = await db.createUser({
      lineUserId: 'test-user-123',
      displayName: '測試法師',
      identity: 'monk',
      phone: '0912345678',
      templeName: '測試寺院',
    });

    expect(user.identity).toBe('monk');
    expect(user.templeName).toBe('測試寺院');

    // 2. Get available events
    const events = await db.getEvents();
    expect(events).toHaveLength(1);
    const event = events[0];

    // 3. Create registration
    const registration = await db.createRegistration({
      userId: user.lineUserId,
      eventId: event.id,
      identity: 'monk',
      personalInfo: {
        name: '測試法師',
        phone: '0912345678',
        templeName: '測試寺院',
        specialRequirements: '素食',
      },
      transport: {
        required: true,
        locationId: 'transport-1',
        pickupTime: new Date('2024-12-01T07:30:00Z'),
      },
      status: 'pending',
    });

    expect(registration.userId).toBe(user.lineUserId);
    expect(registration.eventId).toBe(event.id);
    expect(registration.personalInfo.templeName).toBe('測試寺院');

    // 4. Update registration status
    const updatedRegistration = await db.updateRegistration(registration.id, {
      status: 'confirmed',
      pretixOrderId: 'ORDER-123',
    });

    expect(updatedRegistration?.status).toBe('confirmed');
    expect(updatedRegistration?.pretixOrderId).toBe('ORDER-123');

    // 5. Verify user can query their registrations
    const userRegistrations = await db.getRegistrationsByUserId(user.lineUserId);
    expect(userRegistrations).toHaveLength(1);
    expect(userRegistrations[0].status).toBe('confirmed');
  });

  test('should handle volunteer registration with different fields', async () => {
    // Create volunteer user
    const user = await db.createUser({
      lineUserId: 'volunteer-123',
      displayName: '測試志工',
      identity: 'volunteer',
      phone: '0987654321',
      emergencyContact: '0912345678',
    });

    expect(user.identity).toBe('volunteer');
    expect(user.emergencyContact).toBe('0912345678');

    const events = await db.getEvents();
    const event = events[0];

    // Create volunteer registration
    const registration = await db.createRegistration({
      userId: user.lineUserId,
      eventId: event.id,
      identity: 'volunteer',
      personalInfo: {
        name: '測試志工',
        phone: '0987654321',
        emergencyContact: '0912345678',
        specialRequirements: '無',
      },
      transport: {
        required: false,
      },
      status: 'pending',
    });

    expect(registration.identity).toBe('volunteer');
    expect(registration.personalInfo.emergencyContact).toBe('0912345678');
    expect(registration.transport?.required).toBe(false);
  });

  test('should track event participant counts correctly', async () => {
    const events = await db.getEvents();
    const event = events[0];

    // Initially no participants
    expect(event.currentParticipants).toBe(0);

    // Add some registrations
    await db.createRegistration({
      userId: 'user1',
      eventId: event.id,
      identity: 'monk',
      personalInfo: { name: '法師1', phone: '0911111111' },
      status: 'confirmed',
    });

    await db.createRegistration({
      userId: 'user2',
      eventId: event.id,
      identity: 'volunteer',
      personalInfo: { name: '志工1', phone: '0922222222' },
      status: 'confirmed',
    });

    await db.createRegistration({
      userId: 'user3',
      eventId: event.id,
      identity: 'volunteer',
      personalInfo: { name: '志工2', phone: '0933333333' },
      status: 'pending', // This shouldn't count
    });

    // Check registration counts
    const registrations = await db.getRegistrationsByEventId(event.id);
    const confirmedRegistrations = registrations.filter(reg => reg.status === 'confirmed');
    
    expect(registrations).toHaveLength(3);
    expect(confirmedRegistrations).toHaveLength(2);

    const monks = confirmedRegistrations.filter(reg => reg.identity === 'monk');
    const volunteers = confirmedRegistrations.filter(reg => reg.identity === 'volunteer');
    
    expect(monks).toHaveLength(1);
    expect(volunteers).toHaveLength(1);
  });

  test('should handle transport booking correctly', async () => {
    const events = await db.getEvents();
    const event = events[0];
    const transportOptions = await db.getTransportOptionsByEventId(event.id);
    const station = transportOptions[0]; // 彰化火車站

    expect(station.bookedSeats).toBe(0);
    expect(station.maxSeats).toBe(45);

    // Book some seats
    const updatedTransport = await db.updateTransportOption(station.id, {
      bookedSeats: 10,
    });

    expect(updatedTransport?.bookedSeats).toBe(10);
    expect(updatedTransport?.maxSeats - updatedTransport?.bookedSeats).toBe(35); // Available seats
  });
});