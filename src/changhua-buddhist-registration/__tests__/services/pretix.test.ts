import axios from 'axios';
import { PretixClient, PretixAPIError, PretixConfig } from '../../services/pretix';
import { PretixEvent, PretixItem, PretixQuota, PretixOrder, PretixOrderRequest } from '../../types/pretix';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PretixClient', () => {
  let pretixClient: PretixClient;
  let mockAxiosInstance: jest.Mocked<any>;

  const mockConfig: PretixConfig = {
    baseURL: 'https://test.pretix.eu/api/v1',
    apiToken: 'test-token',
    organizerSlug: 'test-organizer'
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        response: {
          use: jest.fn()
        }
      }
    };

    // Mock axios.create to return our mock instance
    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Mock the error interceptor to actually call our error handler
    mockAxiosInstance.interceptors.response.use.mockImplementation((successHandler, errorHandler) => {
      // Store the error handler for later use
      mockAxiosInstance._errorHandler = errorHandler;
    });

    pretixClient = new PretixClient(mockConfig);
  });

  describe('constructor', () => {
    it('should create axios instance with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: mockConfig.baseURL,
        headers: {
          'Authorization': `Token ${mockConfig.apiToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });
    });

    it('should set up response interceptor', () => {
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('getEvents', () => {
    const mockEvents: PretixEvent[] = [
      {
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
        location: { 'zh-tw': '彰化縣' },
        geo_lat: null,
        geo_lon: null,
        plugins: [],
        has_subevents: false,
        meta_data: {},
        seating_plan: null,
        seat_category_mapping: {}
      }
    ];

    it('should fetch events successfully', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { results: mockEvents }
      });

      const result = await pretixClient.getEvents();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/organizers/test-organizer/events/');
      expect(result).toEqual(mockEvents);
    });

    it('should return cached events on second call', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { results: mockEvents }
      });

      // First call
      await pretixClient.getEvents();
      // Second call
      const result = await pretixClient.getEvents();

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockEvents);
    });

    it('should handle API errors', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { detail: 'Not found' }
        }
      };
      
      // Simulate the error interceptor behavior
      mockAxiosInstance.get.mockImplementation(() => {
        const error = mockAxiosInstance._errorHandler ? mockAxiosInstance._errorHandler(mockError) : mockError;
        return Promise.reject(error);
      });

      await expect(pretixClient.getEvents()).rejects.toThrow(PretixAPIError);
    });
  });

  describe('getEvent', () => {
    const mockEvent: PretixEvent = {
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
      location: { 'zh-tw': '彰化縣' },
      geo_lat: null,
      geo_lon: null,
      plugins: [],
      has_subevents: false,
      meta_data: {},
      seating_plan: null,
      seat_category_mapping: {}
    };

    it('should fetch specific event successfully', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: mockEvent
      });

      const result = await pretixClient.getEvent('test-event');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/organizers/test-organizer/events/test-event/');
      expect(result).toEqual(mockEvent);
    });
  });

  describe('getEventItems', () => {
    const mockItems: PretixItem[] = [
      {
        id: 1,
        name: { 'zh-tw': '法師報名' },
        internal_name: 'monk-registration',
        default_price: '0.00',
        category: null,
        active: true,
        description: { 'zh-tw': '法師報名項目' },
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

    it('should fetch event items successfully', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { results: mockItems }
      });

      const result = await pretixClient.getEventItems('test-event');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/organizers/test-organizer/events/test-event/items/');
      expect(result).toEqual(mockItems);
    });
  });

  describe('getEventQuotas', () => {
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
      }
    ];

    it('should fetch event quotas successfully', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { results: mockQuotas }
      });

      const result = await pretixClient.getEventQuotas('test-event');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/organizers/test-organizer/events/test-event/quotas/');
      expect(result).toEqual(mockQuotas);
    });
  });

  describe('createOrder', () => {
    const mockOrderRequest: PretixOrderRequest = {
      email: 'test@example.com',
      phone: '+886912345678',
      locale: 'zh-tw',
      sales_channel: 'web',
      positions: [{
        item: 1,
        attendee_name: '測試法師',
        attendee_email: 'test@example.com',
        meta_data: {
          line_user_id: 'U1234567890',
          identity: 'monk'
        }
      }]
    };

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

    it('should create order successfully', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: mockOrder
      });

      const result = await pretixClient.createOrder('test-event', mockOrderRequest);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/organizers/test-organizer/events/test-event/orders/',
        mockOrderRequest
      );
      expect(result).toEqual(mockOrder);
    });

    it('should clear cache after creating order', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: mockOrder
      });

      // First populate cache
      mockAxiosInstance.get.mockResolvedValue({
        data: { results: [] }
      });
      await pretixClient.getEvents();

      // Create order (should clear cache)
      await pretixClient.createOrder('test-event', mockOrderRequest);

      // Get events again (should make new API call)
      await pretixClient.getEvents();

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('getOrder', () => {
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

    it('should fetch order successfully', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: mockOrder
      });

      const result = await pretixClient.getOrder('test-event', 'ABC123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/organizers/test-organizer/events/test-event/orders/ABC123/');
      expect(result).toEqual(mockOrder);
    });
  });

  describe('cancelOrder', () => {
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

    it('should cancel order successfully', async () => {
      mockAxiosInstance.patch.mockResolvedValue({
        data: mockCancelledOrder
      });

      const result = await pretixClient.cancelOrder('test-event', 'ABC123');

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        '/organizers/test-organizer/events/test-event/orders/ABC123/',
        { status: 'c' }
      );
      expect(result).toEqual(mockCancelledOrder);
    });
  });

  describe('error handling', () => {
    it('should handle 400 Bad Request', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { detail: '請求資料格式錯誤' }
        }
      };
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(pretixClient.getEvents()).rejects.toThrow(
        expect.objectContaining({
          message: '請求資料格式錯誤',
          statusCode: 400,
          code: 'BAD_REQUEST'
        })
      );
    });

    it('should handle 401 Unauthorized', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {}
        }
      };
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(pretixClient.getEvents()).rejects.toThrow(
        expect.objectContaining({
          message: 'API 認證失敗，請檢查 API Token',
          statusCode: 401,
          code: 'UNAUTHORIZED'
        })
      );
    });

    it('should handle 403 Forbidden', async () => {
      const mockError = {
        response: {
          status: 403,
          data: { detail: '沒有權限' }
        }
      };
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(pretixClient.getEvents()).rejects.toThrow(
        expect.objectContaining({
          message: '沒有權限',
          statusCode: 403,
          code: 'FORBIDDEN'
        })
      );
    });

    it('should handle 404 Not Found', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { detail: '找不到資源' }
        }
      };
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(pretixClient.getEvents()).rejects.toThrow(
        expect.objectContaining({
          message: '找不到資源',
          statusCode: 404,
          code: 'NOT_FOUND'
        })
      );
    });

    it('should handle 429 Rate Limited', async () => {
      const mockError = {
        response: {
          status: 429,
          data: {}
        }
      };
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(pretixClient.getEvents()).rejects.toThrow(
        expect.objectContaining({
          message: 'API 請求頻率過高，請稍後再試',
          statusCode: 429,
          code: 'RATE_LIMITED'
        })
      );
    });

    it('should handle 500 Server Error', async () => {
      const mockError = {
        response: {
          status: 500,
          data: {}
        }
      };
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(pretixClient.getEvents()).rejects.toThrow(
        expect.objectContaining({
          message: 'Pretix 服務暫時無法使用，請稍後再試',
          statusCode: 500,
          code: 'SERVER_ERROR'
        })
      );
    });

    it('should handle network errors', async () => {
      const mockError = {
        request: {},
        message: 'Network Error'
      };
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(pretixClient.getEvents()).rejects.toThrow(
        expect.objectContaining({
          message: '無法連接到 Pretix 服務，請檢查網路連線',
          code: 'NETWORK_ERROR'
        })
      );
    });
  });

  describe('retry mechanism', () => {
    it('should retry on server errors', async () => {
      const mockError = {
        response: {
          status: 500,
          data: {}
        }
      };
      
      // First two calls fail, third succeeds
      mockAxiosInstance.get
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({
          data: { results: [] }
        });

      const result = await pretixClient.getEvents();

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
      expect(result).toEqual([]);
    });

    it('should not retry on client errors', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { detail: 'Bad request' }
        }
      };
      
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(pretixClient.getEvents()).rejects.toThrow(PretixAPIError);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      pretixClient.clearCache();
      const stats = pretixClient.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });

    it('should provide cache statistics', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { results: [] }
      });

      await pretixClient.getEvents();
      const stats = pretixClient.getCacheStats();

      expect(stats.size).toBeGreaterThan(0);
      expect(stats.keys.length).toBeGreaterThan(0);
    });
  });

  describe('healthCheck', () => {
    it('should return true when service is healthy', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {}
      });

      const result = await pretixClient.healthCheck();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/organizers/test-organizer/');
      expect(result).toBe(true);
    });

    it('should return false when service is unhealthy', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Service unavailable'));

      const result = await pretixClient.healthCheck();

      expect(result).toBe(false);
    });
  });
});