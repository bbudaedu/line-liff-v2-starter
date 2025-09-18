import { NextApiRequest, NextApiResponse } from 'next';

interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: 'ok' | 'error';
    pretix: 'ok' | 'error';
    line: 'ok' | 'error';
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthCheckResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: 'error',
        pretix: 'error',
        line: 'error'
      },
      memory: {
        used: 0,
        total: 0,
        percentage: 0
      }
    });
  }

  try {
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const memoryPercentage = Math.round((usedMemory / totalMemory) * 100);

    // Check services (simplified checks)
    const services = {
      database: 'ok' as const, // In a real app, you'd check database connectivity
      pretix: await checkPretixHealth(),
      line: await checkLineHealth()
    };

    const overallStatus = Object.values(services).every(status => status === 'ok') ? 'ok' : 'error';

    const healthResponse: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      services,
      memory: {
        used: Math.round(usedMemory / 1024 / 1024), // MB
        total: Math.round(totalMemory / 1024 / 1024), // MB
        percentage: memoryPercentage
      }
    };

    // Set appropriate status code
    const statusCode = overallStatus === 'ok' ? 200 : 503;
    
    res.status(statusCode).json(healthResponse);
  } catch (error) {
    console.error('Health check failed:', error);
    
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: 'error',
        pretix: 'error',
        line: 'error'
      },
      memory: {
        used: 0,
        total: 0,
        percentage: 0
      }
    });
  }
}

async function checkPretixHealth(): Promise<'ok' | 'error'> {
  try {
    if (!process.env.PRETIX_API_URL || !process.env.PRETIX_API_TOKEN) {
      return 'error';
    }

    // Make actual API call to check Pretix connectivity
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${process.env.PRETIX_API_URL}/organizers/${process.env.PRETIX_ORGANIZER_SLUG}/`, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${process.env.PRETIX_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response.ok ? 'ok' : 'error';
  } catch (error) {
    console.error('Pretix health check failed:', error);
    return 'error';
  }
}

async function checkLineHealth(): Promise<'ok' | 'error'> {
  try {
    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      return 'error';
    }

    // Make actual API call to check LINE connectivity
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://api.line.me/v2/bot/info', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response.ok ? 'ok' : 'error';
  } catch (error) {
    console.error('LINE health check failed:', error);
    return 'error';
  }
}