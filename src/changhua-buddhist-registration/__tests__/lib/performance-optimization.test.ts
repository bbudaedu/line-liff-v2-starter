/**
 * 效能優化系統測試
 */

import { cache, withCache } from '../../lib/cache';
import { preloader, smartPreloader } from '../../lib/preloader';
import { codeSplittingManager } from '../../lib/code-splitting';
import { databaseOptimizer } from '../../lib/database-optimizer';
import { performanceMonitor } from '../../lib/performance-monitor';

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  getEntriesByType: jest.fn(() => []),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000
  }
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock PerformanceObserver
global.PerformanceObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn()
}));

describe('Cache System', () => {
  beforeEach(() => {
    cache.clear();
  });

  test('should cache and retrieve data', () => {
    const testData = { id: 1, name: 'test' };
    cache.set('test-key', testData);
    
    const retrieved = cache.get('test-key');
    expect(retrieved).toEqual(testData);
  });

  test('should expire cached data after TTL', async () => {
    const testData = { id: 1, name: 'test' };
    cache.set('test-key', testData, 100); // 100ms TTL
    
    expect(cache.get('test-key')).toEqual(testData);
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));
    
    expect(cache.get('test-key')).toBeNull();
  });

  test('should work with cache decorator', async () => {
    let callCount = 0;
    
    const testFunction = withCache(
      async (id: number) => {
        callCount++;
        return { id, data: `data-${id}` };
      },
      (id: number) => `test-${id}`
    );

    // First call should execute function
    const result1 = await testFunction(1);
    expect(result1).toEqual({ id: 1, data: 'data-1' });
    expect(callCount).toBe(1);

    // Second call should use cache
    const result2 = await testFunction(1);
    expect(result2).toEqual({ id: 1, data: 'data-1' });
    expect(callCount).toBe(1); // Should not increment
  });

  test('should provide cache statistics', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    
    const stats = cache.getStats();
    expect(stats.memoryItems).toBe(2);
    expect(stats.maxMemoryItems).toBeGreaterThan(0);
  });
});

describe('Preloader System', () => {
  beforeEach(() => {
    preloader.clear();
  });

  test('should register and execute preload tasks', async () => {
    let executed = false;
    
    preloader.register(
      'test-task',
      async () => {
        executed = true;
        return { data: 'test' };
      },
      { priority: 'high' }
    );

    await preloader.preload(['test-task']);
    
    // Give some time for async execution
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(executed).toBe(true);
    expect(preloader.isLoaded('test-task')).toBe(true);
  });

  test('should handle preload task failures gracefully', async () => {
    preloader.register(
      'failing-task',
      async () => {
        throw new Error('Task failed');
      },
      { priority: 'high' }
    );

    // Should not throw
    await expect(preloader.preload(['failing-task'])).resolves.toBeUndefined();
    
    expect(preloader.isLoaded('failing-task')).toBe(false);
  });

  test('should respect task priorities', async () => {
    const executionOrder: string[] = [];
    
    preloader.register(
      'low-priority',
      async () => {
        executionOrder.push('low');
        return {};
      },
      { priority: 'low' }
    );

    preloader.register(
      'high-priority',
      async () => {
        executionOrder.push('high');
        return {};
      },
      { priority: 'high' }
    );

    await preloader.preload(['low-priority', 'high-priority']);
    
    // Give time for execution
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(executionOrder[0]).toBe('high');
  });

  test('should record user behavior for smart preloading', () => {
    smartPreloader.recordBehavior('view_events');
    smartPreloader.recordBehavior('select_event');
    
    // Should not throw and should handle behavior recording
    expect(() => smartPreloader.recordBehavior('start_registration')).not.toThrow();
  });
});

describe('Code Splitting Manager', () => {
  test('should track chunk loading statistics', () => {
    const initialStats = codeSplittingManager.getStats();
    expect(initialStats.loadedChunks).toBe(0);
    expect(initialStats.failedChunks).toBe(0);
  });

  test('should preload chunks', async () => {
    const mockImport = jest.fn().mockResolvedValue({ default: {} });
    
    await codeSplittingManager.preloadChunk(mockImport);
    
    expect(mockImport).toHaveBeenCalled();
  });

  test('should handle chunk loading failures', async () => {
    const mockImport = jest.fn().mockRejectedValue(new Error('Chunk load failed'));
    
    // Should not throw
    await expect(codeSplittingManager.preloadChunk(mockImport)).resolves.toBeUndefined();
    
    const stats = codeSplittingManager.getStats();
    expect(stats.failedChunks).toBe(1);
  });

  test('should batch preload multiple chunks', async () => {
    const mockImport1 = jest.fn().mockResolvedValue({ default: {} });
    const mockImport2 = jest.fn().mockResolvedValue({ default: {} });
    
    await codeSplittingManager.preloadChunks([mockImport1, mockImport2]);
    
    expect(mockImport1).toHaveBeenCalled();
    expect(mockImport2).toHaveBeenCalled();
  });
});

describe('Database Optimizer', () => {
  test('should execute optimized queries with caching', async () => {
    const mockQuery = 'SELECT * FROM users WHERE id = ?';
    const mockParams = [1];
    const mockResult = { id: 1, name: 'Test User' };

    // Mock the internal query execution
    jest.spyOn(databaseOptimizer as any, 'executeQuery')
      .mockResolvedValue(mockResult);

    // First execution
    const result1 = await databaseOptimizer.executeOptimizedQuery(
      mockQuery,
      mockParams,
      { cache: true }
    );
    expect(result1).toEqual(mockResult);

    // Second execution should use cache
    const result2 = await databaseOptimizer.executeOptimizedQuery(
      mockQuery,
      mockParams,
      { cache: true }
    );
    expect(result2).toEqual(mockResult);
  });

  test('should record query statistics', async () => {
    const mockQuery = 'SELECT * FROM events';
    
    jest.spyOn(databaseOptimizer as any, 'executeQuery')
      .mockResolvedValue([]);

    await databaseOptimizer.executeOptimizedQuery(mockQuery);
    
    const stats = databaseOptimizer.getQueryStats();
    expect(stats.length).toBeGreaterThan(0);
    expect(stats[0].query).toContain('select * from events');
  });

  test('should identify slow queries', async () => {
    const mockQuery = 'SELECT * FROM large_table';
    
    // Mock slow query
    jest.spyOn(databaseOptimizer as any, 'executeQuery')
      .mockImplementation(() => new Promise(resolve => 
        setTimeout(() => resolve([]), 1500)
      ));

    await databaseOptimizer.executeOptimizedQuery(mockQuery);
    
    const slowQueries = databaseOptimizer.getSlowQueries(1000);
    expect(slowQueries.length).toBeGreaterThan(0);
  });

  test('should provide cache statistics', () => {
    const stats = databaseOptimizer.getCacheStats();
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('maxSize');
    expect(stats).toHaveProperty('hitRate');
  });
});

describe('Performance Monitor', () => {
  test('should generate performance report', () => {
    const report = performanceMonitor.getPerformanceReport();
    
    expect(report).toHaveProperty('metrics');
    expect(report).toHaveProperty('summary');
    expect(report).toHaveProperty('issues');
    expect(report).toHaveProperty('recommendations');
    
    expect(Array.isArray(report.metrics)).toBe(true);
    expect(Array.isArray(report.issues)).toBe(true);
    expect(Array.isArray(report.recommendations)).toBe(true);
  });

  test('should export metrics data', () => {
    const exportedData = performanceMonitor.exportMetrics();
    
    expect(typeof exportedData).toBe('string');
    
    const parsed = JSON.parse(exportedData);
    expect(parsed).toHaveProperty('timestamp');
    expect(parsed).toHaveProperty('metrics');
    expect(parsed).toHaveProperty('report');
  });

  test('should clear metrics', () => {
    // Add some mock metrics first
    (performanceMonitor as any).recordMetric('test_metric', 100);
    
    let report = performanceMonitor.getPerformanceReport();
    expect(report.metrics.length).toBeGreaterThan(0);
    
    performanceMonitor.clearMetrics();
    
    report = performanceMonitor.getPerformanceReport();
    expect(report.metrics.length).toBe(0);
  });
});

describe('Integration Tests', () => {
  test('should work together - cache and preloader', async () => {
    // Set up a cached API response
    cache.set('api_events', [{ id: 1, name: 'Test Event' }]);
    
    // Register preloader task that uses cached data
    preloader.register(
      'events_with_cache',
      async () => {
        const cachedEvents = cache.get('api_events');
        return cachedEvents || [];
      },
      { priority: 'high' }
    );

    await preloader.preload(['events_with_cache']);
    
    expect(preloader.isLoaded('events_with_cache')).toBe(true);
  });

  test('should handle performance monitoring with other systems', () => {
    // Test that performance monitoring doesn't interfere with other systems
    cache.set('test_key', 'test_value');
    
    const report = performanceMonitor.getPerformanceReport();
    const cacheStats = cache.getStats();
    
    expect(report).toBeDefined();
    expect(cacheStats.memoryItems).toBe(1);
  });
});

describe('Error Handling', () => {
  test('should handle localStorage unavailability gracefully', () => {
    // Mock localStorage to throw error
    const originalLocalStorage = global.localStorage;
    delete (global as any).localStorage;
    
    expect(() => {
      cache.set('test', 'value');
      cache.get('test');
    }).not.toThrow();
    
    // Restore localStorage
    global.localStorage = originalLocalStorage;
  });

  test('should handle performance API unavailability', () => {
    const originalPerformance = global.performance;
    delete (global as any).performance;
    
    expect(() => {
      performanceMonitor.getPerformanceReport();
    }).not.toThrow();
    
    // Restore performance
    global.performance = originalPerformance;
  });
});