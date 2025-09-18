/**
 * Environment Configuration Management
 * Centralized configuration with validation and type safety
 */

export interface EnvironmentConfig {
  // Application
  NODE_ENV: 'development' | 'staging' | 'production';
  PORT: number;
  
  // LINE Integration
  LINE_CHANNEL_ACCESS_TOKEN: string;
  LINE_CHANNEL_SECRET: string;
  LIFF_ID: string;
  LINE_CHANNEL_ID: string;
  
  // Pretix Integration
  PRETIX_API_URL: string;
  PRETIX_API_TOKEN: string;
  PRETIX_ORGANIZER_SLUG: string;
  
  // Database
  DATABASE_URL: string;
  REDIS_URL?: string;
  
  // Security
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
  
  // Monitoring
  SENTRY_DSN?: string;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
  
  // External Services
  ANALYTICS_ID?: string;
}

class EnvironmentValidator {
  private static requiredVars = [
    'LINE_CHANNEL_ACCESS_TOKEN',
    'LINE_CHANNEL_SECRET',
    'LIFF_ID',
    'PRETIX_API_URL',
    'PRETIX_API_TOKEN',
    'PRETIX_ORGANIZER_SLUG',
    'DATABASE_URL',
    'JWT_SECRET',
    'ENCRYPTION_KEY'
  ];

  static validate(): EnvironmentConfig {
    const missing: string[] = [];
    
    for (const varName of this.requiredVars) {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    }
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    return {
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
      PORT: parseInt(process.env.PORT || '3000', 10),
      
      LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
      LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET!,
      LIFF_ID: process.env.LIFF_ID!,
      LINE_CHANNEL_ID: process.env.LINE_CHANNEL_ID!,
      
      PRETIX_API_URL: process.env.PRETIX_API_URL!,
      PRETIX_API_TOKEN: process.env.PRETIX_API_TOKEN!,
      PRETIX_ORGANIZER_SLUG: process.env.PRETIX_ORGANIZER_SLUG!,
      
      DATABASE_URL: process.env.DATABASE_URL!,
      REDIS_URL: process.env.REDIS_URL,
      
      JWT_SECRET: process.env.JWT_SECRET!,
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
      
      SENTRY_DSN: process.env.SENTRY_DSN,
      LOG_LEVEL: (process.env.LOG_LEVEL as any) || 'info',
      
      ANALYTICS_ID: process.env.ANALYTICS_ID
    };
  }
  
  static validateClient(): Record<string, string> {
    const clientVars = {
      NEXT_PUBLIC_LIFF_ID: process.env.NEXT_PUBLIC_LIFF_ID,
      NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
      NEXT_PUBLIC_LINE_CHANNEL_ID: process.env.NEXT_PUBLIC_LINE_CHANNEL_ID,
      NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
      NEXT_PUBLIC_ANALYTICS_ID: process.env.NEXT_PUBLIC_ANALYTICS_ID
    };
    
    const missing = Object.entries(clientVars)
      .filter(([key, value]) => key.includes('LIFF_ID') && !value)
      .map(([key]) => key);
    
    if (missing.length > 0) {
      throw new Error(`Missing required client environment variables: ${missing.join(', ')}`);
    }
    
    return clientVars as Record<string, string>;
  }
}

// Export validated configuration
export const env = EnvironmentValidator.validate();
export const clientEnv = EnvironmentValidator.validateClient();

// Environment helpers
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isStaging = env.NODE_ENV === 'staging';

// Security configuration
export const securityConfig = {
  cors: {
    origin: isProduction 
      ? ['https://changhua-buddhist.netlify.app', 'https://liff.line.me']
      : ['http://localhost:3000', 'http://localhost:9000', 'https://liff.line.me'],
    credentials: true,
    optionsSuccessStatus: 200
  },
  
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProduction ? 100 : 1000, // requests per window
    message: 'Too many requests from this IP'
  },
  
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://static.line-scdn.net"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.line.me", env.PRETIX_API_URL],
        fontSrc: ["'self'", "data:"]
      }
    },
    crossOriginEmbedderPolicy: false
  }
};