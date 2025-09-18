import { NextApiRequest, NextApiResponse } from 'next';
import { env } from '../../../config/environment';

interface MetricsResponse {
  timestamp: string;
  application: {
    name: string;
    version: string;
    environment: string;
    uptime: number;
    startTime: string;
  };
  system: {
    platform: string;
    arch: string;
    nodeVersion: string;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
      arrayBuffers: number;
    };
    cpu: {
      usage: number;
      loadAverage: number[];
    };
  };
  performance: {
    eventLoopDelay: number;
    gcStats?: {
      totalHeapSize: number;
      totalHeapSizeExecutable: number;
      totalPhysicalSize: number;
      totalAvailableSize: number;
      usedHeapSize: number;
      heapSizeLimit: number;
    };
  };
  counters: {
    httpRequests: number;
    errors: number;
    registrations: number;
    lineMessages: number;
  };
}

// Simple in-memory counters (in production, use Redis or database)
const counters = {
  httpRequests: 0,
  errors: 0,
  registrations: 0,
  lineMessages: 0
};

class MetricsCollector {
  private static startTime = new Date();

  static getCpuUsage(): number {
    const cpus = require('os').cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu: any) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    return Math.round(100 - (100 * totalIdle / totalTick));
  }

  static async getEventLoopDelay(): Promise<number> {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const delta = process.hrtime.bigint() - start;
        resolve(Number(delta) / 1000000); // Convert to milliseconds
      });
    });
  }

  static getGCStats(): any {
    try {
      // This would require the 'gc-stats' package in production
      return {
        totalHeapSize: 0,
        totalHeapSizeExecutable: 0,
        totalPhysicalSize: 0,
        totalAvailableSize: 0,
        usedHeapSize: 0,
        heapSizeLimit: 0
      };
    } catch {
      return undefined;
    }
  }

  static async collectMetrics(): Promise<MetricsResponse> {
    const memoryUsage = process.memoryUsage();
    const eventLoopDelay = await this.getEventLoopDelay();
    const gcStats = this.getGCStats();

    return {
      timestamp: new Date().toISOString(),
      application: {
        name: 'changhua-buddhist-registration',
        version: process.env.npm_package_version || '1.0.0',
        environment: env.NODE_ENV,
        uptime: Math.floor(process.uptime()),
        startTime: this.startTime.toISOString()
      },
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
          arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024)
        },
        cpu: {
          usage: this.getCpuUsage(),
          loadAverage: require('os').loadavg()
        }
      },
      performance: {
        eventLoopDelay,
        ...(gcStats && { gcStats })
      },
      counters: { ...counters }
    };
  }
}

// Middleware to increment counters
export function incrementCounter(type: keyof typeof counters, amount: number = 1) {
  counters[type] += amount;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MetricsResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' } as any);
  }

  // Increment HTTP request counter
  incrementCounter('httpRequests');

  try {
    const metrics = await MetricsCollector.collectMetrics();
    res.status(200).json(metrics);
  } catch (error) {
    console.error('Metrics collection failed:', error);
    incrementCounter('errors');
    res.status(500).json({ error: 'Failed to collect metrics' } as any);
  }
}