import { NextApiRequest, NextApiResponse } from 'next';
import { env } from '../../../config/environment';

interface ServiceStatusResponse {
  timestamp: string;
  overall: 'operational' | 'degraded' | 'outage';
  services: {
    [key: string]: {
      status: 'operational' | 'degraded' | 'outage';
      responseTime?: number;
      lastCheck: string;
      uptime: number;
      incidents: number;
    };
  };
  incidents: Array<{
    id: string;
    title: string;
    status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
    impact: 'minor' | 'major' | 'critical';
    createdAt: string;
    updatedAt: string;
  }>;
}

class StatusMonitor {
  private static serviceHistory: Map<string, Array<{ timestamp: string; status: string; responseTime?: number }>> = new Map();
  private static incidents: Array<any> = [];

  static recordServiceCheck(serviceName: string, status: string, responseTime?: number) {
    if (!this.serviceHistory.has(serviceName)) {
      this.serviceHistory.set(serviceName, []);
    }
    
    const history = this.serviceHistory.get(serviceName)!;
    history.push({
      timestamp: new Date().toISOString(),
      status,
      responseTime
    });
    
    // Keep only last 100 records
    if (history.length > 100) {
      history.shift();
    }
  }

  static calculateUptime(serviceName: string): number {
    const history = this.serviceHistory.get(serviceName) || [];
    if (history.length === 0) return 100;
    
    const operational = history.filter(h => h.status === 'operational').length;
    return Math.round((operational / history.length) * 100);
  }

  static async checkService(name: string, url: string, headers?: Record<string, string>): Promise<{
    status: 'operational' | 'degraded' | 'outage';
    responseTime: number;
  }> {
    const start = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: headers || {},
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - start;
      
      let status: 'operational' | 'degraded' | 'outage';
      if (response.ok) {
        status = responseTime > 5000 ? 'degraded' : 'operational';
      } else {
        status = 'outage';
      }
      
      this.recordServiceCheck(name, status, responseTime);
      
      return { status, responseTime };
    } catch (error) {
      const responseTime = Date.now() - start;
      this.recordServiceCheck(name, 'outage', responseTime);
      
      return { status: 'outage', responseTime };
    }
  }

  static async getSystemStatus(): Promise<ServiceStatusResponse> {
    const checks = await Promise.allSettled([
      this.checkService('pretix', `${env.PRETIX_API_URL}/organizers/${env.PRETIX_ORGANIZER_SLUG}/`, {
        'Authorization': `Token ${env.PRETIX_API_TOKEN}`
      }),
      this.checkService('line', 'https://api.line.me/v2/bot/info', {
        'Authorization': `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`
      }),
      this.checkService('database', 'http://localhost:3000/api/health') // Self health check for DB
    ]);

    const services: ServiceStatusResponse['services'] = {};
    const serviceNames = ['pretix', 'line', 'database'];
    
    checks.forEach((result, index) => {
      const serviceName = serviceNames[index];
      
      if (result.status === 'fulfilled') {
        services[serviceName] = {
          status: result.value.status,
          responseTime: result.value.responseTime,
          lastCheck: new Date().toISOString(),
          uptime: this.calculateUptime(serviceName),
          incidents: 0 // Would be calculated from incident history
        };
      } else {
        services[serviceName] = {
          status: 'outage',
          lastCheck: new Date().toISOString(),
          uptime: this.calculateUptime(serviceName),
          incidents: 0
        };
      }
    });

    // Determine overall status
    const statuses = Object.values(services).map(s => s.status);
    let overall: 'operational' | 'degraded' | 'outage';
    
    if (statuses.includes('outage')) {
      overall = 'outage';
    } else if (statuses.includes('degraded')) {
      overall = 'degraded';
    } else {
      overall = 'operational';
    }

    return {
      timestamp: new Date().toISOString(),
      overall,
      services,
      incidents: this.incidents
    };
  }

  static createIncident(title: string, impact: 'minor' | 'major' | 'critical') {
    const incident = {
      id: `inc_${Date.now()}`,
      title,
      status: 'investigating' as const,
      impact,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.incidents.unshift(incident);
    
    // Keep only last 50 incidents
    if (this.incidents.length > 50) {
      this.incidents.pop();
    }
    
    return incident;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ServiceStatusResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' } as any);
  }

  try {
    const status = await StatusMonitor.getSystemStatus();
    res.status(200).json(status);
  } catch (error) {
    console.error('Status check failed:', error);
    
    res.status(500).json({
      timestamp: new Date().toISOString(),
      overall: 'outage',
      services: {},
      incidents: []
    });
  }
}