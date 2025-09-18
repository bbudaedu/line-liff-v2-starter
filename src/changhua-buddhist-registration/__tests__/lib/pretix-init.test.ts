import {
  initializePretixServices,
  getPretixClient,
  getRegistrationService,
  isServicesInitialized,
  reinitializePretixServices,
  cleanupPretixServices,
  getServicesHealthStatus,
  getServicesStats,
  initializePretixServicesForTesting
} from '../../lib/pretix-init';
import { PretixClient } from '../../services/pretix';
import { RegistrationService } from '../../services/registration';
import * as pretixConfig from '../../config/pretix';

// Mock the services
jest.mock('../../services/pretix');
jest.mock('../../services/registration');
jest.mock('../../config/pretix');

const MockedPretixClient = PretixClient as jest.MockedClass<typeof PretixClient>;
const MockedRegistrationService = RegistrationService as jest.MockedClass<typeof RegistrationService>;

describe('pretix-init', () => {
  let mockPretixClient: jest.Mocked<PretixClient>;
  let mockRegistrationService: jest.Mocked<RegistrationService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset initialization state
    cleanupPretixServices();

    // Mock config
    (pretixConfig.getPretixConfig as jest.Mock).mockReturnValue({
      baseURL: 'https://test.pretix.eu/api/v1',
      apiToken: 'test-token',
      organizerSlug: 'test-organizer'
    });

    (pretixConfig.validatePretixConfig as jest.Mock).mockReturnValue({
      isValid: true,
      errors: []
    });

    // Create mock instances
    mockPretixClient = {
      healthCheck: jest.fn(),
      clearCache: jest.fn(),
      getCacheStats: jest.fn()
    } as any;

    mockRegistrationService = {
      getHealthStatus: jest.fn()
    } as any;

    // Mock constructors
    MockedPretixClient.mockImplementation(() => mockPretixClient);
    MockedRegistrationService.mockImplementation(() => mockRegistrationService);
    
    // Mock the module functions
    jest.doMock('../../services/pretix', () => ({
      PretixClient: MockedPretixClient,
      initializePretixClient: jest.fn(() => mockPretixClient),
      getPretixClient: jest.fn(() => mockPretixClient)
    }));
    
    jest.doMock('../../services/registration', () => ({
      RegistrationService: MockedRegistrationService,
      initializeRegistrationService: jest.fn(() => mockRegistrationService),
      getRegistrationService: jest.fn(() => mockRegistrationService)
    }));
  });

  afterEach(() => {
    cleanupPretixServices();
  });

  describe('initializePretixServices', () => {
    it('should initialize services successfully', async () => {
      mockPretixClient.healthCheck.mockResolvedValue(true);

      const result = await initializePretixServices();

      expect(pretixConfig.getPretixConfig).toHaveBeenCalled();
      expect(pretixConfig.validatePretixConfig).toHaveBeenCalled();
      expect(MockedPretixClient).toHaveBeenCalledWith({
        baseURL: 'https://test.pretix.eu/api/v1',
        apiToken: 'test-token',
        organizerSlug: 'test-organizer'
      });
      expect(MockedRegistrationService).toHaveBeenCalledWith(mockPretixClient);
      expect(mockPretixClient.healthCheck).toHaveBeenCalled();
      expect(result.pretixClient).toBe(mockPretixClient);
      expect(result.registrationService).toBe(mockRegistrationService);
    });

    it('should handle invalid configuration', async () => {
      (pretixConfig.validatePretixConfig as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Invalid API token']
      });

      await expect(initializePretixServices()).rejects.toThrow(
        'Pretix configuration invalid: Invalid API token'
      );
    });

    it('should continue initialization even if health check fails', async () => {
      mockPretixClient.healthCheck.mockResolvedValue(false);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await initializePretixServices();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Pretix service health check failed, but continuing with initialization'
      );
      expect(result.pretixClient).toBe(mockPretixClient);
      expect(result.registrationService).toBe(mockRegistrationService);

      consoleSpy.mockRestore();
    });

    it('should return existing instances on subsequent calls', async () => {
      mockPretixClient.healthCheck.mockResolvedValue(true);

      // First call
      const result1 = await initializePretixServices();
      
      // Second call
      const result2 = await initializePretixServices();

      expect(MockedPretixClient).toHaveBeenCalledTimes(1);
      expect(MockedRegistrationService).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2);
    });

    it('should handle initialization errors', async () => {
      (pretixConfig.getPretixConfig as jest.Mock).mockImplementation(() => {
        throw new Error('Configuration error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(initializePretixServices()).rejects.toThrow('Configuration error');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to initialize Pretix services:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getPretixClient', () => {
    it('should return initialized client', async () => {
      mockPretixClient.healthCheck.mockResolvedValue(true);
      await initializePretixServices();

      const client = getPretixClient();

      expect(client).toBe(mockPretixClient);
    });

    it('should throw error if not initialized', () => {
      expect(() => getPretixClient()).toThrow(
        'Pretix client not initialized. Call initializePretixServices first.'
      );
    });
  });

  describe('getRegistrationService', () => {
    it('should return initialized service', async () => {
      mockPretixClient.healthCheck.mockResolvedValue(true);
      await initializePretixServices();

      const service = getRegistrationService();

      expect(service).toBe(mockRegistrationService);
    });

    it('should throw error if not initialized', () => {
      expect(() => getRegistrationService()).toThrow(
        'Registration service not initialized. Call initializePretixServices first.'
      );
    });
  });

  describe('isServicesInitialized', () => {
    it('should return false initially', () => {
      expect(isServicesInitialized()).toBe(false);
    });

    it('should return true after initialization', async () => {
      mockPretixClient.healthCheck.mockResolvedValue(true);
      await initializePretixServices();

      expect(isServicesInitialized()).toBe(true);
    });

    it('should return false after cleanup', async () => {
      mockPretixClient.healthCheck.mockResolvedValue(true);
      await initializePretixServices();
      cleanupPretixServices();

      expect(isServicesInitialized()).toBe(false);
    });
  });

  describe('reinitializePretixServices', () => {
    it('should reinitialize services', async () => {
      mockPretixClient.healthCheck.mockResolvedValue(true);
      
      // Initial initialization
      await initializePretixServices();
      expect(MockedPretixClient).toHaveBeenCalledTimes(1);

      // Reinitialize
      await reinitializePretixServices();
      expect(MockedPretixClient).toHaveBeenCalledTimes(2);
    });
  });

  describe('cleanupPretixServices', () => {
    it('should cleanup services and clear cache', async () => {
      mockPretixClient.healthCheck.mockResolvedValue(true);
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await initializePretixServices();
      cleanupPretixServices();

      expect(mockPretixClient.clearCache).toHaveBeenCalled();
      expect(isServicesInitialized()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Pretix services cleaned up');

      consoleSpy.mockRestore();
    });
  });

  describe('getServicesHealthStatus', () => {
    it('should return health status when services are initialized and healthy', async () => {
      mockPretixClient.healthCheck.mockResolvedValue(true);
      mockRegistrationService.getHealthStatus.mockResolvedValue({
        healthy: true,
        message: 'Service is healthy'
      });

      await initializePretixServices();
      const status = await getServicesHealthStatus();

      expect(status).toEqual({
        initialized: true,
        pretixHealthy: true,
        registrationServiceHealthy: true,
        errors: []
      });
    });

    it('should return errors when services are unhealthy', async () => {
      mockPretixClient.healthCheck.mockResolvedValue(false);
      mockRegistrationService.getHealthStatus.mockResolvedValue({
        healthy: false,
        message: 'Service is unhealthy'
      });

      await initializePretixServices();
      const status = await getServicesHealthStatus();

      expect(status).toEqual({
        initialized: true,
        pretixHealthy: false,
        registrationServiceHealthy: false,
        errors: ['Pretix service unhealthy', 'Service is unhealthy']
      });
    });

    it('should return errors when services are not initialized', async () => {
      const status = await getServicesHealthStatus();

      expect(status).toEqual({
        initialized: false,
        pretixHealthy: false,
        registrationServiceHealthy: false,
        errors: ['Services not initialized']
      });
    });

    it('should handle health check errors', async () => {
      mockPretixClient.healthCheck.mockRejectedValue(new Error('Health check failed'));

      await initializePretixServices();
      const status = await getServicesHealthStatus();

      expect(status.errors).toContain('Health check failed: Health check failed');
    });
  });

  describe('getServicesStats', () => {
    it('should return stats when services are initialized', async () => {
      mockPretixClient.healthCheck.mockResolvedValue(true);
      mockPretixClient.getCacheStats.mockReturnValue({
        size: 5,
        keys: ['key1', 'key2']
      });

      await initializePretixServices();
      const stats = getServicesStats();

      expect(stats).toEqual({
        initialized: true,
        cacheStats: {
          size: 5,
          keys: ['key1', 'key2']
        }
      });
    });

    it('should return minimal stats when services are not initialized', () => {
      const stats = getServicesStats();

      expect(stats).toEqual({
        initialized: false
      });
    });
  });

  describe('initializePretixServicesForTesting', () => {
    it('should initialize services with test configuration', async () => {
      const testConfig = {
        baseURL: 'https://test.example.com/api/v1',
        apiToken: 'test-token-123',
        organizerSlug: 'test-org'
      };

      const result = await initializePretixServicesForTesting(testConfig);

      expect(MockedPretixClient).toHaveBeenCalledWith(testConfig);
      expect(MockedRegistrationService).toHaveBeenCalledWith(mockPretixClient);
      expect(result.pretixClient).toBe(mockPretixClient);
      expect(result.registrationService).toBe(mockRegistrationService);
      expect(isServicesInitialized()).toBe(true);
    });

    it('should use default test configuration if none provided', async () => {
      const result = await initializePretixServicesForTesting();

      expect(MockedPretixClient).toHaveBeenCalledWith({
        baseURL: 'https://test.pretix.eu/api/v1',
        apiToken: 'test-token',
        organizerSlug: 'test-organizer'
      });
      expect(result.pretixClient).toBe(mockPretixClient);
      expect(result.registrationService).toBe(mockRegistrationService);
    });
  });
});