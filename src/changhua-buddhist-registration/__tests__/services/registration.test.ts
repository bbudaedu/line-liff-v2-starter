import { RegistrationService } from '../../services/registration';
import { PretixClient, PretixAPIError } from '../../services/pretix';
import {
  PretixEvent,
  PretixItem,
  PretixQuota,
  PretixOrder,
  RegistrationData,
  LocalizedEvent
} from '../../types/pretix';

// Mock PretixClient
jest.mock('../../services/pretix');
const MockedPretixClient = PretixClient as jest.MockedClass<typeof PretixClient>;

describe('RegistrationService', () => {
  let registrationService: RegistrationService;
  let mockPretixClient: jest.Mocked<PretixClient>;

  beforeEach(() => {
    mockPretixClient = new MockedPretixClient({} as any) as jest.Mocked<PretixClient>;
    registrationService = new RegistrationService(mockPretixClient);
  });

  describe('getLocalizedEvents', () => {
    const mockEvents: PretixEvent[] = [
      {
        slug: 'test-event-1',
        name: { 'zh-tw': '彰化供佛齋僧活動', 'en': 'Changhua Buddhist Event' },
        live: true,
        testmode: false,
        currency: 'TWD',
        date_from: '2024-12-01T10:00:00Z',
        date_to: '2024-12-01T18:00:00Z',
        date_admission: '2024-12-01T09:30:00Z',
        is_public: true,
        presale_start: '2024-11-01T00:00:00Z',
        presale_end: '2024-11-30T23:59:59Z',
        location: { 'zh-tw': '彰化縣福興鄉', 'en': 'Fuxing Township, Changhua County' },
        geo_lat: 24.0408,
        geo_lon: 120.4818,
        plugins: [],
        has_subevents: false,
        meta_data: {},
        seating_plan: null,
        seat_category_mapping: {}
      },
      {
        slug: 'test-event-2',
        name: { 'zh-tw': '私人活動', 'en': 'Private Event' },
        live: true,
        testmode: false,
        currency: 'TWD',
        date_from: '2024-12-15T10:00:00Z',
        date_to: '2024-12-15T18:00:00Z',
        date_admission: null,
        is_public: false, // 非公開活動
        presale_start: null,
        presale_end: null,
        location: null,
        geo_lat: null,
        geo_lon: null,
        plugins: [],
        has_subevents: false,
        meta_data: {},
        seating_plan: null,
        seat_category_mapping: {}
      }
    ];

    const mockItems: PretixItem[] = [
      {
        id: 1,
        name: { 'zh-tw': '法師報名', 'en': 'Monk Registration' },
        internal_name: 'monk-registration',
        default_price: '0.00',
        category: null,
        active: true,
        description: { 'zh-tw': '法師報名項目', 'en': 'Monk registration item' },
        free_price: false,
        tax_rule: null,
        admission: true,
        position: 1,
        picture: null,
        available_from: null,
        available_until: null,
        require_voucher: false,
        hide_without_voucher: false,
        allow_cancel: true,
        min_per_order: null,
        max_per_order: 1,
        checkin_attention: false,
        has_variations: false,
        variations: [],
        addons: [],
        bundles: [],
        meta_data: {},
        sales_channels: ['web'],
        issue_giftcard: false
      },
      {
        id: 2,
        name: { 'zh-tw': '志工報名', 'en': 'Volunteer Registration' },
        internal_name: 'volunteer-registration',
        default_price: '0.00',
        category: null,
        active: true,
        description: { 'zh-tw': '志工報名項目', 'en': 'Volunteer registration item' },
        free_price: false,
        tax_rule: null,
        admission: true,
        position: 2,
        picture: null,
        available_from: null,
        available_until: null,
        require_voucher: false,
        hide_without_voucher: false,
        allow_cancel: true,
        min_per_order: null,
        max_per_order: 1,
        checkin_attention: false,
        has_variations: false,
        variations: [],
        addons: [],
        bundles: [],
        meta_data: {},
        sales_channels: ['web'],
        issue_giftcard: false
      }
    ];

    const mockQuotas: PretixQuota[] = [
      {
        id: 1,
        name: '法師名額',
        size: 50,
        items: [1],
        variations: [],
        subevent: null,
        close_when_sold_out: true,
        closed: false,
        available: true,
        available_number: 45,
        total_size: 50,
        pending_orders: 2,
        blocked: 0,
        reserved: 3,
        cart_positions: 0,
        waiting_list: 0
      },
      {
        id: 2,
        name: '志工名額',
        size: 100,
        items: [2],
        variations: [],
        subevent: null,
        close_when_sold_out: true,
        closed: false,
        available: true,
        available_number: 85,
        total_size: 100,
        pending_orders: 5,
        blocked: 0,
        reserved: 10,
        cart_positions: 0,
        waiting_list: 0
      }
    ];

    it('should return localized events for public events only', async () => {
      mockPretixClient.getEvents.mockResolvedValue(mockEvents);
      mockPretixClient.getEventItems.mockResolvedValue(mockItems);
      mockPretixClient.getEventQuotas.mockResolvedValue(mockQuotas);

      const result = await registrationService.getLocalizedEvents('zh-tw');

      expect(result).toHaveLength(1); // 只有公開活動
      expect(result[0].slug).toBe('test-event-1');
      expect(result[0].name).toBe('彰化供佛齋僧活動');
      expect(result[0].location).toBe('彰化縣福興鄉');
      expect(result[0].items).toHaveLength(2);
      expect(result[0].totalSeats).toBe(150);
      expect(result[0].availableSeats).toBe(130);
    });

    it('should handle empty events list', async () => {
      mockPretixClient.getEvents.mockResolvedValue([]);

      const result = await registrationService.getLocalizedEvents();

      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      const apiError = new PretixAPIError('API Error', 500, 'SERVER_ERROR');
      mockPretixClient.getEvents.mockRejectedValue(apiError);

      await expect(registrationService.getLocalizedEvents()).rejects.toThrow(PretixAPIError);
    });

    it('should sort events by date', async () => {
      const eventsWithDifferentDates = [
        { ...mockEvents[0], date_from: '2024-12-15T10:00:00Z' },
        { ...mockEvents[0], slug: 'earlier-event', date_from: '2024-12-01T10:00:00Z' }
      ];

      mockPretixClient.getEvents.mockResolvedValue(eventsWithDifferentDates);
      mockPretixClient.getEventItems.mockResolvedValue(mockItems);
      mockPretixClient.getEventQuotas.mockResolvedValue(mockQuotas);

      const result = await registrationService.getLocalizedEvents();

      expect(result[0].slug).toBe('earlier-event'); // 較早的活動在前
      expect(result[1].slug).toBe('test-event-1');
    });
  });

  describe('getEventDetails', () => {
    const mockEvent = {
      slug: 'test-event',
      name: { 'zh-tw': '測試活動' },
      live: true,
      testmode: false,
      currency: 'TWD',
      date_from: '2024-12-01T10:00:00Z',
      date_to: '2024-12-01T18:00:00Z',
      date_admission: null,
      is_public: true,
      presale_start: null,
      presale_end: null,
      location: { 'zh-tw': '測試地點' },
      geo_lat: null,
      geo_lon: null,
      plugins: [],
      has_subevents: false,
      meta_data: {},
      seating_plan: null,
      seat_category_mapping: {}
    };

    it('should return localized event details', async () => {
      mockPretixClient.getEvent.mockResolvedValue(mockEvent);
      mockPretixClient.getEventItems.mockResolvedValue([]);
      mockPretixClient.getEventQuotas.mockResolvedValue([]);

      const result = await registrationService.getEventDetails('test-event');

      expect(mockPretixClient.getEvent).toHaveBeenCalledWith('test-event');
      expect(result.slug).toBe('test-event');
      expect(result.name).toBe('測試活動');
      expect(result.location).toBe('測試地點');
    });
  });

  describe('checkEventAvailability', () => {
    const mockEvent = {
      slug: 'test-event',
      name: { 'zh-tw': '測試活動' },
      live: true,
      testmode: false,
      currency: 'TWD',
      date_from: '2024-12-01T10:00:00Z',
      date_to: '2024-12-01T18:00:00Z',
      date_admission: null,
      is_public: true,
      presale_start: '2024-11-01T00:00:00Z',
      presale_end: '2024-11-30T23:59:59Z',
      location: null,
      geo_lat: null,
      geo_lon: null,
      plugins: [],
      has_subevents: false,
      meta_data: {},
      seating_plan: null,
      seat_category_mapping: {}
    };

    const mockItems = [
      {
        id: 1,
        name: { 'zh-tw': '法師報名' },
        internal_name: 'monk-registration',
        default_price: '0.00',
        category: null,
        active: true,
        description: null,
        free_price: false,
        tax_rule: null,
        admission: true,
        position: 1,
        picture: null,
        available_from: null,
        available_until: null,
        require_voucher: false,
        hide_without_voucher: false,
        allow_cancel: true,
        min_per_order: null,
        max_per_order: 1,
        checkin_attention: false,
        has_variations: false,
        variations: [],
        addons: [],
        bundles: [],
        meta_data: {},
        sales_channels: ['web'],
        issue_giftcard: false
      }
    ];

    const mockQuotas = [
      {
        id: 1,
        name: '法師名額',
        size: 50,
        items: [1],
        variations: [],
        subevent: null,
        close_when_sold_out: true,
        closed: false,
        available: true,
        available_number: 10,
        total_size: 50,
        pending_orders: 0,
        blocked: 0,
        reserved: 0,
        cart_positions: 0,
        waiting_list: 0
      }
    ];

    beforeEach(() => {
      // Mock current date to be within presale period
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-11-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return available when event is open and has available items', async () => {
      mockPretixClient.getEvent.mockResolvedValue(mockEvent);
      mockPretixClient.getEventItems.mockResolvedValue(mockItems);
      mockPretixClient.getEventQuotas.mockResolvedValue(mockQuotas);

      const result = await registrationService.checkEventAvailability('test-event');

      expect(result.isAvailable).toBe(true);
      expect(result.availableItems).toHaveLength(1);
      expect(result.availableItems[0].available).toBe(true);
      expect(result.availableItems[0].availableCount).toBe(10);
    });

    it('should return not available when presale has not started', async () => {
      const futureEvent = {
        ...mockEvent,
        presale_start: '2024-12-01T00:00:00Z'
      };

      mockPretixClient.getEvent.mockResolvedValue(futureEvent);
      mockPretixClient.getEventItems.mockResolvedValue(mockItems);
      mockPretixClient.getEventQuotas.mockResolvedValue(mockQuotas);

      const result = await registrationService.checkEventAvailability('test-event');

      expect(result.isAvailable).toBe(false);
      expect(result.message).toBe('報名尚未開始');
    });

    it('should return not available when presale has ended', async () => {
      const pastEvent = {
        ...mockEvent,
        presale_end: '2024-11-01T23:59:59Z'
      };

      mockPretixClient.getEvent.mockResolvedValue(pastEvent);
      mockPretixClient.getEventItems.mockResolvedValue(mockItems);
      mockPretixClient.getEventQuotas.mockResolvedValue(mockQuotas);

      const result = await registrationService.checkEventAvailability('test-event');

      expect(result.isAvailable).toBe(false);
      expect(result.message).toBe('報名已截止');
    });

    it('should return not available when all items are sold out', async () => {
      const soldOutQuotas = [
        {
          ...mockQuotas[0],
          available: false,
          available_number: 0
        }
      ];

      mockPretixClient.getEvent.mockResolvedValue(mockEvent);
      mockPretixClient.getEventItems.mockResolvedValue(mockItems);
      mockPretixClient.getEventQuotas.mockResolvedValue(soldOutQuotas);

      const result = await registrationService.checkEventAvailability('test-event');

      expect(result.isAvailable).toBe(false);
      expect(result.message).toBe('所有項目已額滿');
      expect(result.availableItems[0].available).toBe(false);
    });
  });

  describe('createRegistration', () => {
    const mockRegistrationData: RegistrationData = {
      eventSlug: 'test-event',
      identity: 'monk',
      personalInfo: {
        name: '測試法師',
        phone: '+886912345678',
        email: 'test@example.com',
        templeName: '測試寺院',
        specialRequirements: '素食'
      },
      transport: {
        required: true,
        locationId: 'changhua-station',
        pickupTime: '07:30'
      },
      lineUserId: 'U1234567890'
    };

    const mockEvent = {
      slug: 'test-event',
      name: { 'zh-tw': '測試活動' },
      live: true,
      testmode: false,
      currency: 'TWD',
      date_from: '2024-12-01T10:00:00Z',
      date_to: '2024-12-01T18:00:00Z',
      date_admission: null,
      is_public: true,
      presale_start: '2024-11-01T00:00:00Z',
      presale_end: '2024-11-30T23:59:59Z',
      location: null,
      geo_lat: null,
      geo_lon: null,
      plugins: [],
      has_subevents: false,
      meta_data: {},
      seating_plan: null,
      seat_category_mapping: {}
    };

    const mockItems = [
      {
        id: 1,
        name: { 'zh-tw': '法師報名' },
        internal_name: 'monk-registration',
        default_price: '0.00',
        category: null,
        active: true,
        description: null,
        free_price: false,
        tax_rule: null,
        admission: true,
        position: 1,
        picture: null,
        available_from: null,
        available_until: null,
        require_voucher: false,
        hide_without_voucher: false,
        allow_cancel: true,
        min_per_order: null,
        max_per_order: 1,
        checkin_attention: false,
        has_variations: false,
        variations: [],
        addons: [],
        bundles: [],
        meta_data: {},
        sales_channels: ['web'],
        issue_giftcard: false
      }
    ];

    const mockQuotas = [
      {
        id: 1,
        name: '法師名額',
        size: 50,
        items: [1],
        variations: [],
        subevent: null,
        close_when_sold_out: true,
        closed: false,
        available: true,
        available_number: 10,
        total_size: 50,
        pending_orders: 0,
        blocked: 0,
        reserved: 0,
        cart_positions: 0,
        waiting_list: 0
      }
    ];

    const mockOrder: PretixOrder = {
      code: 'ABC123',
      status: 'n',
      testmode: false,
      secret: 'secret123',
      email: 'test@example.com',
      phone: '+886912345678',
      locale: 'zh-tw',
      datetime: '2024-11-15T10:00:00Z',
      expires: null,
      last_modified: '2024-11-15T10:00:00Z',
      total: '0.00',
      comment: '',
      checkin_attention: false,
      require_approval: false,
      sales_channel: 'web',
      positions: [],
      fees: [],
      payments: [],
      refunds: [],
      invoice_address: {
        is_business: false,
        company: '',
        name: '測試法師',
        name_parts: {},
        street: '',
        zipcode: '',
        city: '',
        country: 'TW',
        state: '',
        vat_id: '',
        vat_id_validated: false,
        internal_reference: ''
      },
      meta_data: {},
      valid_if_pending: false
    };

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-11-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should create registration successfully', async () => {
      // Mock availability check
      mockPretixClient.getEvent.mockResolvedValue(mockEvent);
      mockPretixClient.getEventItems.mockResolvedValue(mockItems);
      mockPretixClient.getEventQuotas.mockResolvedValue(mockQuotas);
      
      // Mock order creation
      mockPretixClient.createOrder.mockResolvedValue(mockOrder);

      const result = await registrationService.createRegistration(mockRegistrationData);

      expect(result.success).toBe(true);
      expect(result.order).toEqual(mockOrder);
      expect(mockPretixClient.createOrder).toHaveBeenCalledWith(
        'test-event',
        expect.objectContaining({
          email: 'test@example.com',
          phone: '+886912345678',
          locale: 'zh-tw',
          positions: expect.arrayContaining([
            expect.objectContaining({
              item: 1,
              attendee_name: '測試法師',
              meta_data: expect.objectContaining({
                line_user_id: 'U1234567890',
                identity: 'monk',
                temple_name: '測試寺院',
                transport_required: true
              })
            })
          ])
        })
      );
    });

    it('should fail when event is not available', async () => {
      const unavailableEvent = {
        ...mockEvent,
        presale_end: '2024-11-01T23:59:59Z'
      };

      mockPretixClient.getEvent.mockResolvedValue(unavailableEvent);
      mockPretixClient.getEventItems.mockResolvedValue(mockItems);
      mockPretixClient.getEventQuotas.mockResolvedValue(mockQuotas);

      const result = await registrationService.createRegistration(mockRegistrationData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('報名已截止');
      expect(result.errorCode).toBe('EVENT_NOT_AVAILABLE');
    });

    it('should fail when item is not found', async () => {
      const itemsWithoutMonk = [
        {
          ...mockItems[0],
          name: { 'zh-tw': '志工報名' },
          internal_name: 'volunteer-registration'
        }
      ];

      mockPretixClient.getEvent.mockResolvedValue(mockEvent);
      mockPretixClient.getEventItems.mockResolvedValue(itemsWithoutMonk);
      mockPretixClient.getEventQuotas.mockResolvedValue(mockQuotas);

      const result = await registrationService.createRegistration(mockRegistrationData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('找不到對應的報名項目');
      expect(result.errorCode).toBe('ITEM_NOT_FOUND');
    });

    it('should handle Pretix API errors', async () => {
      mockPretixClient.getEvent.mockResolvedValue(mockEvent);
      mockPretixClient.getEventItems.mockResolvedValue(mockItems);
      mockPretixClient.getEventQuotas.mockResolvedValue(mockQuotas);
      
      const apiError = new PretixAPIError('訂單建立失敗', 400, 'BAD_REQUEST');
      mockPretixClient.createOrder.mockRejectedValue(apiError);

      const result = await registrationService.createRegistration(mockRegistrationData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('訂單建立失敗');
      expect(result.errorCode).toBe('BAD_REQUEST');
    });
  });

  describe('getRegistrationStatus', () => {
    const mockOrder: PretixOrder = {
      code: 'ABC123',
      status: 'p',
      testmode: false,
      secret: 'secret123',
      email: 'test@example.com',
      phone: '+886912345678',
      locale: 'zh-tw',
      datetime: '2024-11-15T10:00:00Z',
      expires: null,
      last_modified: '2024-11-15T10:00:00Z',
      total: '0.00',
      comment: '',
      checkin_attention: false,
      require_approval: false,
      sales_channel: 'web',
      positions: [],
      fees: [],
      payments: [],
      refunds: [],
      invoice_address: {
        is_business: false,
        company: '',
        name: '測試法師',
        name_parts: {},
        street: '',
        zipcode: '',
        city: '',
        country: 'TW',
        state: '',
        vat_id: '',
        vat_id_validated: false,
        internal_reference: ''
      },
      meta_data: {},
      valid_if_pending: false
    };

    it('should get registration status successfully', async () => {
      mockPretixClient.getOrder.mockResolvedValue(mockOrder);

      const result = await registrationService.getRegistrationStatus('test-event', 'ABC123');

      expect(mockPretixClient.getOrder).toHaveBeenCalledWith('test-event', 'ABC123');
      expect(result).toEqual(mockOrder);
    });
  });

  describe('cancelRegistration', () => {
    const mockCancelledOrder: PretixOrder = {
      code: 'ABC123',
      status: 'c',
      testmode: false,
      secret: 'secret123',
      email: 'test@example.com',
      phone: '+886912345678',
      locale: 'zh-tw',
      datetime: '2024-11-15T10:00:00Z',
      expires: null,
      last_modified: '2024-11-15T10:00:00Z',
      total: '0.00',
      comment: '',
      checkin_attention: false,
      require_approval: false,
      sales_channel: 'web',
      positions: [],
      fees: [],
      payments: [],
      refunds: [],
      invoice_address: {
        is_business: false,
        company: '',
        name: '測試法師',
        name_parts: {},
        street: '',
        zipcode: '',
        city: '',
        country: 'TW',
        state: '',
        vat_id: '',
        vat_id_validated: false,
        internal_reference: ''
      },
      meta_data: {},
      valid_if_pending: false
    };

    it('should cancel registration successfully', async () => {
      mockPretixClient.cancelOrder.mockResolvedValue(mockCancelledOrder);

      const result = await registrationService.cancelRegistration('test-event', 'ABC123');

      expect(mockPretixClient.cancelOrder).toHaveBeenCalledWith('test-event', 'ABC123');
      expect(result).toEqual(mockCancelledOrder);
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status when Pretix is available', async () => {
      mockPretixClient.healthCheck.mockResolvedValue(true);

      const result = await registrationService.getHealthStatus();

      expect(result.healthy).toBe(true);
      expect(result.message).toBe('Pretix 服務正常');
    });

    it('should return unhealthy status when Pretix is unavailable', async () => {
      mockPretixClient.healthCheck.mockResolvedValue(false);

      const result = await registrationService.getHealthStatus();

      expect(result.healthy).toBe(false);
      expect(result.message).toBe('Pretix 服務異常');
    });

    it('should handle health check errors', async () => {
      mockPretixClient.healthCheck.mockRejectedValue(new Error('Connection failed'));

      const result = await registrationService.getHealthStatus();

      expect(result.healthy).toBe(false);
      expect(result.message).toBe('Pretix 服務檢查失敗: Connection failed');
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      registrationService.clearCache();
      expect(mockPretixClient.clearCache).toHaveBeenCalled();
    });

    it('should get cache stats', () => {
      const mockStats = { size: 5, keys: ['key1', 'key2'] };
      mockPretixClient.getCacheStats.mockReturnValue(mockStats);

      const result = registrationService.getCacheStats();

      expect(mockPretixClient.getCacheStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });
  });
});