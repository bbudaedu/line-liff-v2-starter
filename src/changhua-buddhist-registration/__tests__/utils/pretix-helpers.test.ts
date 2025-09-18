import {
  getLocalizedText,
  formatDateTime,
  formatDate,
  formatTime,
  isEventRegistrationOpen,
  findItemByIdentity,
  calculateItemAvailability,
  getOrderStatusText,
  canCancelOrder,
  canModifyOrder,
  buildOrderComment,
  buildPretixOrderRequest,
  validateRegistrationData,
  isValidPhoneNumber,
  isValidEmail,
  formatPhoneNumber,
  getEventTimeRemaining,
  formatTimeRemaining,
  generateEventSummary
} from '../../utils/pretix-helpers';
import {
  PretixEvent,
  PretixItem,
  PretixQuota,
  PretixOrder,
  RegistrationData,
  LocalizedEvent
} from '../../types/pretix';
import { PRETIX_CONSTANTS } from '../../config/pretix';

describe('pretix-helpers', () => {
  describe('getLocalizedText', () => {
    it('should return localized text for specified locale', () => {
      const textObj = {
        'zh-tw': '繁體中文',
        'zh-cn': '简体中文',
        'en': 'English'
      };

      expect(getLocalizedText(textObj, 'zh-tw')).toBe('繁體中文');
      expect(getLocalizedText(textObj, 'en')).toBe('English');
    });

    it('should fallback to zh-tw if specified locale not found', () => {
      const textObj = {
        'zh-tw': '繁體中文',
        'en': 'English'
      };

      expect(getLocalizedText(textObj, 'fr')).toBe('繁體中文');
    });

    it('should fallback to en if zh-tw not found', () => {
      const textObj = {
        'en': 'English',
        'fr': 'Français'
      };

      expect(getLocalizedText(textObj, 'zh-tw')).toBe('English');
    });

    it('should return first available value if no fallbacks found', () => {
      const textObj = {
        'fr': 'Français',
        'de': 'Deutsch'
      };

      expect(getLocalizedText(textObj, 'zh-tw')).toBe('Français');
    });

    it('should handle string input', () => {
      expect(getLocalizedText('Simple string')).toBe('Simple string');
    });

    it('should handle null/undefined input', () => {
      expect(getLocalizedText(null)).toBe('');
      expect(getLocalizedText(undefined)).toBe('');
    });
  });

  describe('date formatting functions', () => {
    const testDate = '2024-12-01T14:30:00Z';

    beforeEach(() => {
      // Mock timezone to ensure consistent test results
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-11-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should format date time correctly', () => {
      const result = formatDateTime(testDate);
      expect(result).toMatch(/2024\/12\/01/);
      expect(result).toMatch(/22:30/); // UTC+8
    });

    it('should format date correctly', () => {
      const result = formatDate(testDate);
      expect(result).toMatch(/2024\/12\/01/);
    });

    it('should format time correctly', () => {
      const result = formatTime(testDate);
      expect(result).toMatch(/22:30/); // UTC+8
    });

    it('should handle null dates', () => {
      expect(formatDateTime(null)).toBe('');
      expect(formatDate(null)).toBe('');
      expect(formatTime(null)).toBe('');
    });
  });

  describe('isEventRegistrationOpen', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-11-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return open when no presale dates set', () => {
      const event: PretixEvent = {
        slug: 'test',
        name: { 'zh-tw': 'Test' },
        live: true,
        testmode: false,
        currency: 'TWD',
        date_from: null,
        date_to: null,
        date_admission: null,
        is_public: true,
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
      };

      const result = isEventRegistrationOpen(event);
      expect(result.isOpen).toBe(true);
    });

    it('should return not open when presale has not started', () => {
      const event: PretixEvent = {
        slug: 'test',
        name: { 'zh-tw': 'Test' },
        live: true,
        testmode: false,
        currency: 'TWD',
        date_from: null,
        date_to: null,
        date_admission: null,
        is_public: true,
        presale_start: '2024-12-01T00:00:00Z',
        presale_end: null,
        location: null,
        geo_lat: null,
        geo_lon: null,
        plugins: [],
        has_subevents: false,
        meta_data: {},
        seating_plan: null,
        seat_category_mapping: {}
      };

      const result = isEventRegistrationOpen(event);
      expect(result.isOpen).toBe(false);
      expect(result.reason).toContain('報名將於');
    });

    it('should return not open when presale has ended', () => {
      const event: PretixEvent = {
        slug: 'test',
        name: { 'zh-tw': 'Test' },
        live: true,
        testmode: false,
        currency: 'TWD',
        date_from: null,
        date_to: null,
        date_admission: null,
        is_public: true,
        presale_start: null,
        presale_end: '2024-11-01T23:59:59Z',
        location: null,
        geo_lat: null,
        geo_lon: null,
        plugins: [],
        has_subevents: false,
        meta_data: {},
        seating_plan: null,
        seat_category_mapping: {}
      };

      const result = isEventRegistrationOpen(event);
      expect(result.isOpen).toBe(false);
      expect(result.reason).toContain('報名已於');
    });
  });

  describe('findItemByIdentity', () => {
    const mockItems: PretixItem[] = [
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
      },
      {
        id: 2,
        name: { 'zh-tw': '志工報名' },
        internal_name: 'volunteer-registration',
        default_price: '0.00',
        category: null,
        active: true,
        description: null,
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

    it('should find monk item by name', () => {
      const result = findItemByIdentity(mockItems, 'monk');
      expect(result?.id).toBe(1);
    });

    it('should find volunteer item by name', () => {
      const result = findItemByIdentity(mockItems, 'volunteer');
      expect(result?.id).toBe(2);
    });

    it('should return null if no matching item found', () => {
      const emptyItems: PretixItem[] = [];
      const result = findItemByIdentity(emptyItems, 'monk');
      expect(result).toBeNull();
    });
  });

  describe('calculateItemAvailability', () => {
    const mockItem: PretixItem = {
      id: 1,
      name: { 'zh-tw': '測試項目' },
      internal_name: 'test-item',
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
    };

    it('should return unlimited availability when no quotas', () => {
      const result = calculateItemAvailability(mockItem, []);
      expect(result).toEqual({
        isAvailable: true,
        availableCount: null,
        totalCount: null
      });
    });

    it('should calculate availability with quotas', () => {
      const quotas: PretixQuota[] = [
        {
          id: 1,
          name: '測試配額',
          size: 50,
          items: [1],
          variations: [],
          subevent: null,
          close_when_sold_out: true,
          closed: false,
          available: true,
          available_number: 30,
          total_size: 50,
          pending_orders: 0,
          blocked: 0,
          reserved: 0,
          cart_positions: 0,
          waiting_list: 0
        }
      ];

      const result = calculateItemAvailability(mockItem, quotas);
      expect(result).toEqual({
        isAvailable: true,
        availableCount: 30,
        totalCount: 50
      });
    });

    it('should handle sold out quotas', () => {
      const quotas: PretixQuota[] = [
        {
          id: 1,
          name: '測試配額',
          size: 50,
          items: [1],
          variations: [],
          subevent: null,
          close_when_sold_out: true,
          closed: false,
          available: false,
          available_number: 0,
          total_size: 50,
          pending_orders: 0,
          blocked: 0,
          reserved: 0,
          cart_positions: 0,
          waiting_list: 0
        }
      ];

      const result = calculateItemAvailability(mockItem, quotas);
      expect(result).toEqual({
        isAvailable: false,
        availableCount: null,
        totalCount: 50
      });
    });
  });

  describe('order status functions', () => {
    it('should return correct status text', () => {
      expect(getOrderStatusText(PRETIX_CONSTANTS.ORDER_STATUS.NEW)).toBe('新建');
      expect(getOrderStatusText(PRETIX_CONSTANTS.ORDER_STATUS.PENDING)).toBe('待處理');
      expect(getOrderStatusText(PRETIX_CONSTANTS.ORDER_STATUS.CANCELLED)).toBe('已取消');
      expect(getOrderStatusText('unknown')).toBe('未知狀態');
    });

    it('should check if order can be cancelled', () => {
      const newOrder = { status: PRETIX_CONSTANTS.ORDER_STATUS.NEW } as PretixOrder;
      const pendingOrder = { status: PRETIX_CONSTANTS.ORDER_STATUS.PENDING } as PretixOrder;
      const cancelledOrder = { status: PRETIX_CONSTANTS.ORDER_STATUS.CANCELLED } as PretixOrder;

      expect(canCancelOrder(newOrder)).toBe(true);
      expect(canCancelOrder(pendingOrder)).toBe(true);
      expect(canCancelOrder(cancelledOrder)).toBe(false);
    });

    it('should check if order can be modified', () => {
      const newOrder = { status: PRETIX_CONSTANTS.ORDER_STATUS.NEW } as PretixOrder;
      const pendingOrder = { status: PRETIX_CONSTANTS.ORDER_STATUS.PENDING } as PretixOrder;
      const cancelledOrder = { status: PRETIX_CONSTANTS.ORDER_STATUS.CANCELLED } as PretixOrder;

      expect(canModifyOrder(newOrder)).toBe(true);
      expect(canModifyOrder(pendingOrder)).toBe(true);
      expect(canModifyOrder(cancelledOrder)).toBe(false);
    });
  });

  describe('buildOrderComment', () => {
    it('should build comment for monk registration', () => {
      const registrationData: RegistrationData = {
        eventSlug: 'test-event',
        identity: 'monk',
        personalInfo: {
          name: '測試法師',
          phone: '0912345678',
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

      const comment = buildOrderComment(registrationData);
      
      expect(comment).toContain('身份：法師');
      expect(comment).toContain('姓名：測試法師');
      expect(comment).toContain('寺院：測試寺院');
      expect(comment).toContain('需要交通車：是');
      expect(comment).toContain('特殊需求：素食');
    });

    it('should build comment for volunteer registration', () => {
      const registrationData: RegistrationData = {
        eventSlug: 'test-event',
        identity: 'volunteer',
        personalInfo: {
          name: '測試志工',
          phone: '0912345678',
          emergencyContact: '0987654321'
        },
        transport: {
          required: false
        },
        lineUserId: 'U1234567890'
      };

      const comment = buildOrderComment(registrationData);
      
      expect(comment).toContain('身份：志工');
      expect(comment).toContain('姓名：測試志工');
      expect(comment).toContain('緊急聯絡人：0987654321');
      expect(comment).toContain('需要交通車：否');
    });
  });

  describe('validateRegistrationData', () => {
    const validData: RegistrationData = {
      eventSlug: 'test-event',
      identity: 'monk',
      personalInfo: {
        name: '測試法師',
        phone: '0912345678',
        email: 'test@example.com',
        templeName: '測試寺院'
      },
      lineUserId: 'U1234567890'
    };

    it('should validate correct data', () => {
      const result = validateRegistrationData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should catch missing required fields', () => {
      const invalidData = {
        ...validData,
        personalInfo: {
          ...validData.personalInfo,
          name: ''
        }
      };

      const result = validateRegistrationData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('姓名不能為空');
    });

    it('should validate monk-specific fields', () => {
      const invalidMonkData = {
        ...validData,
        personalInfo: {
          ...validData.personalInfo,
          templeName: undefined
        }
      };

      const result = validateRegistrationData(invalidMonkData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('法師必須填寫寺院名稱');
    });

    it('should validate volunteer-specific fields', () => {
      const invalidVolunteerData: RegistrationData = {
        ...validData,
        identity: 'volunteer',
        personalInfo: {
          name: '測試志工',
          phone: '0912345678'
        }
      };

      const result = validateRegistrationData(invalidVolunteerData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('志工必須填寫緊急聯絡人');
    });

    it('should validate phone number format', () => {
      const invalidPhoneData = {
        ...validData,
        personalInfo: {
          ...validData.personalInfo,
          phone: '123'
        }
      };

      const result = validateRegistrationData(invalidPhoneData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('電話號碼格式不正確');
    });

    it('should validate email format', () => {
      const invalidEmailData = {
        ...validData,
        personalInfo: {
          ...validData.personalInfo,
          email: 'invalid-email'
        }
      };

      const result = validateRegistrationData(invalidEmailData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('電子郵件格式不正確');
    });
  });

  describe('phone and email validation', () => {
    describe('isValidPhoneNumber', () => {
      it('should validate Taiwan mobile numbers', () => {
        expect(isValidPhoneNumber('0912345678')).toBe(true);
        expect(isValidPhoneNumber('09 1234 5678')).toBe(true);
        expect(isValidPhoneNumber('091-234-5678')).toBe(true);
        expect(isValidPhoneNumber('+886-912345678')).toBe(true);
        expect(isValidPhoneNumber('+886912345678')).toBe(true);
      });

      it('should reject invalid phone numbers', () => {
        expect(isValidPhoneNumber('123')).toBe(false);
        expect(isValidPhoneNumber('0812345678')).toBe(false); // Wrong prefix
        expect(isValidPhoneNumber('091234567')).toBe(false); // Too short
        expect(isValidPhoneNumber('09123456789')).toBe(false); // Too long
      });
    });

    describe('isValidEmail', () => {
      it('should validate correct email addresses', () => {
        expect(isValidEmail('test@example.com')).toBe(true);
        expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
        expect(isValidEmail('test+tag@example.org')).toBe(true);
      });

      it('should reject invalid email addresses', () => {
        expect(isValidEmail('invalid-email')).toBe(false);
        expect(isValidEmail('@example.com')).toBe(false);
        expect(isValidEmail('test@')).toBe(false);
        expect(isValidEmail('test@.com')).toBe(false);
      });
    });

    describe('formatPhoneNumber', () => {
      it('should format Taiwan mobile numbers', () => {
        expect(formatPhoneNumber('0912345678')).toBe('0912-345-678');
        expect(formatPhoneNumber('09 1234 5678')).toBe('0912-345-678');
        expect(formatPhoneNumber('091-234-5678')).toBe('0912-345-678');
      });

      it('should preserve international format', () => {
        expect(formatPhoneNumber('+886912345678')).toBe('+886912345678');
      });

      it('should return original for unrecognized formats', () => {
        expect(formatPhoneNumber('123-456-7890')).toBe('123-456-7890');
      });
    });
  });

  describe('time remaining functions', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-11-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('formatTimeRemaining', () => {
      it('should format days correctly', () => {
        const threeDays = 3 * 24 * 60 * 60 * 1000;
        expect(formatTimeRemaining(threeDays)).toBe('3天0小時');
      });

      it('should format hours correctly', () => {
        const fiveHours = 5 * 60 * 60 * 1000;
        expect(formatTimeRemaining(fiveHours)).toBe('5小時0分鐘');
      });

      it('should format minutes correctly', () => {
        const thirtyMinutes = 30 * 60 * 1000;
        expect(formatTimeRemaining(thirtyMinutes)).toBe('30分鐘');
      });

      it('should format seconds correctly', () => {
        const fortyFiveSeconds = 45 * 1000;
        expect(formatTimeRemaining(fortyFiveSeconds)).toBe('45秒');
      });
    });

    describe('getEventTimeRemaining', () => {
      it('should handle events with no start date', () => {
        const event: PretixEvent = {
          slug: 'test',
          name: { 'zh-tw': 'Test' },
          live: true,
          testmode: false,
          currency: 'TWD',
          date_from: null,
          date_to: null,
          date_admission: null,
          is_public: true,
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
        };

        const result = getEventTimeRemaining(event);
        expect(result.displayText).toBe('時間待定');
      });

      it('should handle future events', () => {
        const event: PretixEvent = {
          slug: 'test',
          name: { 'zh-tw': 'Test' },
          live: true,
          testmode: false,
          currency: 'TWD',
          date_from: '2024-12-01T10:00:00Z',
          date_to: '2024-12-01T18:00:00Z',
          date_admission: null,
          is_public: true,
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
        };

        const result = getEventTimeRemaining(event);
        expect(result.hasStarted).toBe(false);
        expect(result.hasEnded).toBe(false);
        expect(result.displayText).toContain('後開始');
      });

      it('should handle past events', () => {
        const event: PretixEvent = {
          slug: 'test',
          name: { 'zh-tw': 'Test' },
          live: true,
          testmode: false,
          currency: 'TWD',
          date_from: '2024-11-01T10:00:00Z',
          date_to: '2024-11-01T18:00:00Z',
          date_admission: null,
          is_public: true,
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
        };

        const result = getEventTimeRemaining(event);
        expect(result.hasStarted).toBe(true);
        expect(result.hasEnded).toBe(true);
        expect(result.displayText).toBe('活動已結束');
      });
    });
  });

  describe('generateEventSummary', () => {
    it('should generate complete event summary', () => {
      const event: LocalizedEvent = {
        slug: 'test-event',
        name: '彰化供佛齋僧活動',
        location: '彰化縣福興鄉',
        dateFrom: new Date('2024-12-01T10:00:00Z'),
        dateTo: new Date('2024-12-01T18:00:00Z'),
        dateAdmission: null,
        presaleStart: null,
        presaleEnd: null,
        isLive: true,
        isPublic: true,
        currency: 'TWD',
        items: [],
        quotas: [],
        availableSeats: 130,
        totalSeats: 150
      };

      const summary = generateEventSummary(event);
      expect(summary).toContain('彰化供佛齋僧活動');
      expect(summary).toContain('2024/12/01');
      expect(summary).toContain('彰化縣福興鄉');
      expect(summary).toContain('(130/150 可用)');
    });

    it('should handle minimal event data', () => {
      const event: LocalizedEvent = {
        slug: 'test-event',
        name: '簡單活動',
        dateFrom: null,
        dateTo: null,
        dateAdmission: null,
        presaleStart: null,
        presaleEnd: null,
        isLive: true,
        isPublic: true,
        currency: 'TWD',
        items: [],
        quotas: []
      };

      const summary = generateEventSummary(event);
      expect(summary).toBe('簡單活動');
    });
  });
});