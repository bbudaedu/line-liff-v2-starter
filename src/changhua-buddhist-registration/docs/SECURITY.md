# Security Implementation Guide

## Overview

This document outlines the comprehensive security features implemented in the Changhua Buddhist Registration system to protect against various security threats and ensure data privacy.

## Security Features

### 1. Input Sanitization and XSS Protection

#### Frontend Protection
- **Input Sanitization**: All user inputs are sanitized using `sanitizeInput()` function
- **XSS Pattern Detection**: Removes script tags, event handlers, and malicious JavaScript
- **HTML Entity Encoding**: Converts dangerous characters to safe HTML entities
- **Form Data Sanitization**: Deep sanitization of nested form objects

```typescript
import { sanitizeInput, sanitizeFormData } from '../utils/security';

// Sanitize single input
const cleanInput = sanitizeInput(userInput);

// Sanitize form data
const cleanFormData = sanitizeFormData(formData);
```

#### Backend Validation
- **Schema Validation**: Using Zod for strict type checking
- **Malicious Pattern Detection**: SQL injection and XSS pattern detection
- **Request Size Limits**: Maximum payload size enforcement

### 2. Rate Limiting and DDoS Protection

#### Rate Limiting Configurations
- **Authentication**: 5 requests per 15 minutes
- **Registration**: 3 requests per minute
- **General API**: 30 requests per minute
- **Sensitive Operations**: 1 request per hour

#### DDoS Protection
- **Rapid-fire Detection**: Blocks clients making >10 requests per second
- **Suspicious Activity Monitoring**: Tracks bot patterns and unusual behavior
- **Automatic Blocking**: Temporary blocks for malicious clients

```typescript
import { rateLimit, rateLimitConfigs } from '../lib/rate-limiting';

// Apply rate limiting to endpoint
const rateLimitedHandler = rateLimit(rateLimitConfigs.registration)(handler);
```

### 3. Data Encryption and Secure Storage

#### Encryption Features
- **AES-256-GCM Encryption**: Strong symmetric encryption for sensitive data
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Salt Generation**: Random salt for each encryption operation
- **Authenticated Encryption**: Prevents tampering with encrypted data

#### Secure Storage
- **In-Memory Encryption**: Sensitive data encrypted in memory
- **TTL Support**: Automatic expiry of cached sensitive data
- **Secure Cleanup**: Proper cleanup of expired data

```typescript
import { encryptData, decryptData, SecureDataStore } from '../lib/encryption';

// Encrypt sensitive data
const encrypted = encryptData(sensitiveData, password);

// Use secure storage
const store = SecureDataStore.getInstance();
store.store('key', data, 3600000); // 1 hour TTL
```

### 4. Security Monitoring and Logging

#### Event Tracking
- **Security Events**: Login attempts, suspicious activity, permission denials
- **Risk Scoring**: Automatic risk assessment for security events
- **Alert System**: Automated alerts for high-risk activities

#### Access Logging
- **Request Logging**: All API requests logged with metadata
- **Performance Monitoring**: Response time and error rate tracking
- **Client Identification**: IP and user agent tracking

```typescript
import { logSecurityEvent, SecurityEventType } from '../lib/security-monitoring';

// Log security event
logSecurityEvent(req, SecurityEventType.SUSPICIOUS_ACTIVITY, 'Unusual request pattern', {
  details: 'Multiple failed attempts'
});
```

### 5. API Security Middleware

#### Security Headers
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-Frame-Options**: Prevents clickjacking
- **X-XSS-Protection**: Browser XSS protection
- **Content-Security-Policy**: Restricts resource loading
- **Strict-Transport-Security**: Enforces HTTPS

#### CORS Protection
- **Origin Validation**: Only allows requests from authorized origins
- **Method Restrictions**: Limits allowed HTTP methods
- **Header Validation**: Controls allowed request headers

## Security Configuration

### Environment Variables

```bash
# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key

# Security Settings
SECURITY_ENABLED=true
RATE_LIMITING_ENABLED=true
DETAILED_LOGGING=false

# CORS Origins
ALLOWED_ORIGINS=https://liff.line.me,https://your-domain.com
```

### Security Middleware Stack

```typescript
// Apply security middleware in order
export default async function secureEndpoint(req: NextApiRequest, res: NextApiResponse) {
  securityHeaders(req, res, () => {
    validateCors(req, res, () => {
      validateInputLength(req, res, () => {
        securityMonitoring(req, res, () => {
          rateLimitedHandler(req, res);
        });
      });
    });
  });
}
```

## Security Testing

### Automated Tests
- **Input Sanitization Tests**: XSS and injection payload testing
- **Rate Limiting Tests**: Boundary and abuse testing
- **Encryption Tests**: Cryptographic function validation
- **Penetration Tests**: Common attack scenario testing

### Test Categories
1. **XSS Protection**: Script injection, event handler injection
2. **SQL Injection**: Various SQL injection patterns
3. **Rate Limiting**: Burst testing, sustained load testing
4. **Encryption**: Key derivation, data integrity, timing attacks

## Security Monitoring

### Metrics Dashboard
Access security metrics via the monitoring endpoint:

```bash
GET /api/v1/security/status
Authorization: Bearer your-monitoring-token
```

### Key Metrics
- **Security Events**: Count by type and risk level
- **Rate Limiting**: Active clients, blocked requests
- **Access Patterns**: Top endpoints, client activity
- **Error Rates**: Failed requests, security violations

## Best Practices

### Development
1. **Input Validation**: Always validate and sanitize user inputs
2. **Error Handling**: Don't expose sensitive information in errors
3. **Logging**: Log security events but mask sensitive data
4. **Testing**: Include security tests in CI/CD pipeline

### Deployment
1. **HTTPS Only**: Always use HTTPS in production
2. **Environment Variables**: Store secrets in environment variables
3. **Monitoring**: Set up alerts for security events
4. **Updates**: Keep dependencies updated for security patches

### Incident Response
1. **Detection**: Monitor for unusual patterns
2. **Analysis**: Investigate security events promptly
3. **Response**: Block malicious clients automatically
4. **Recovery**: Clean up and strengthen defenses

## Security Checklist

- [ ] Input sanitization implemented
- [ ] Rate limiting configured
- [ ] Encryption keys generated and stored securely
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] Security monitoring enabled
- [ ] Tests passing for all security features
- [ ] Production environment secured
- [ ] Monitoring and alerting set up
- [ ] Incident response plan documented

## Common Vulnerabilities Addressed

### OWASP Top 10 Coverage
1. **Injection**: SQL injection and XSS protection
2. **Broken Authentication**: Rate limiting and secure session handling
3. **Sensitive Data Exposure**: Encryption and data masking
4. **XML External Entities**: Input validation and sanitization
5. **Broken Access Control**: Permission validation
6. **Security Misconfiguration**: Secure headers and configuration
7. **Cross-Site Scripting**: XSS protection and CSP
8. **Insecure Deserialization**: Input validation
9. **Known Vulnerabilities**: Dependency monitoring
10. **Insufficient Logging**: Comprehensive security logging

## Support and Maintenance

### Regular Tasks
- Review security logs weekly
- Update security configurations monthly
- Conduct security audits quarterly
- Update dependencies regularly

### Emergency Procedures
- Block malicious IPs immediately
- Rotate encryption keys if compromised
- Scale rate limiting during attacks
- Contact security team for incidents

For questions or security concerns, contact the development team or security officer.