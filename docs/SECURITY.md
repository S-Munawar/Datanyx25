# ImmunoDetect Security Documentation

## Overview

ImmunoDetect handles sensitive health information and implements comprehensive security measures to protect patient data, ensure privacy, and maintain compliance with healthcare regulations.

---

## Authentication

### JWT Token System

ImmunoDetect uses a dual-token authentication system:

#### Access Tokens
- **Algorithm**: HS256
- **Expiration**: 15 minutes
- **Storage**: Memory/localStorage on client
- **Purpose**: API authentication

#### Refresh Tokens
- **Expiration**: 7 days
- **Storage**: Redis with user-specific keys
- **Rotation**: New refresh token issued on each refresh
- **Revocation**: Immediate invalidation on logout

```typescript
// Token structure
interface AccessTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  sessionId: string;
  iat: number;
  exp: number;
}
```

### Password Security

- **Hashing**: bcrypt with cost factor 12
- **Requirements**:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character

```typescript
// Password validation regex
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
```

### OAuth 2.0 (Google)

- **PKCE Flow**: Proof Key for Code Exchange for enhanced security
- **State Parameter**: CSRF protection with cryptographic nonce
- **Scope**: Limited to email and profile information

```typescript
// PKCE implementation
const codeVerifier = generateCodeVerifier();
const codeChallenge = await generateCodeChallenge(codeVerifier);
// Store codeVerifier securely for callback verification
```

---

## Authorization

### Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| **Patient** | View/create own records, view own results |
| **Counselor** | Review assigned patients, submit diagnoses |
| **Researcher** | Access anonymized data, run analytics |
| **Admin** | Full system access, user management |

### Route Protection

```typescript
// Middleware example
const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Insufficient permissions'
      });
    }
    next();
  };
};

// Usage
router.get('/admin/users', authenticate, requireRole('admin'), listUsers);
```

### Resource Ownership

Patients can only access their own records:

```typescript
// Ownership check
if (record.patientId.toString() !== req.user.userId) {
  throw new ForbiddenError('Access denied');
}
```

---

## Session Management

### Redis Session Storage

```typescript
// Session structure in Redis
interface SessionData {
  userId: string;
  refreshToken: string;
  createdAt: number;
  lastActivity: number;
  userAgent: string;
  ipAddress: string;
}

// Key pattern
const sessionKey = `session:${userId}:${sessionId}`;
```

### Session Security Features

1. **Concurrent Session Limit**: Maximum 5 active sessions per user
2. **Session Binding**: IP and User-Agent fingerprinting
3. **Activity Timeout**: Sessions expire after 24 hours of inactivity
4. **Forced Logout**: Admin can invalidate all user sessions

---

## Data Protection

### Encryption at Rest

- **MongoDB**: Database encryption with encryption-at-rest
- **S3**: Server-side encryption (SSE-S3 or SSE-KMS)
- **Redis**: TLS for connections, encrypted volumes

### Encryption in Transit

- **HTTPS**: TLS 1.3 for all API communications
- **WebSocket**: WSS (WebSocket Secure)
- **Database**: TLS connections to MongoDB and Redis

### Data Minimization

- Only collect necessary health information
- Anonymize data for research purposes
- Automatic deletion of expired records

---

## Input Validation

### Request Validation

All inputs are validated using Zod schemas:

```typescript
const healthRecordSchema = z.object({
  demographics: z.object({
    age: z.number().min(0).max(120),
    sex: z.enum(['male', 'female', 'other']),
  }),
  symptoms: z.array(z.string()).min(1),
  geneExpressionData: z.object({
    cd3: z.number().min(0).max(10000),
    cd4: z.number().min(0).max(10000),
    // ... more fields
  }),
});
```

### SQL/NoSQL Injection Prevention

- Parameterized queries with Mongoose
- Input sanitization before database operations
- Strict schema validation

### XSS Prevention

- React's built-in XSS protection
- Content Security Policy headers
- Input encoding on output

---

## Security Headers

Implemented via Helmet.js:

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.FRONTEND_URL],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
}));
```

---

## Rate Limiting

### Configuration

```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'RATE_LIMITED',
    message: 'Too many requests'
  }
});

// Stricter limits for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 min
});
```

### Suspicious Activity Detection

```typescript
// Track failed login attempts
const trackFailedLogin = async (email: string, ip: string) => {
  const key = `failed:${email}:${ip}`;
  const attempts = await redis.incr(key);
  await redis.expire(key, 900); // 15 minutes
  
  if (attempts >= 5) {
    await lockAccount(email);
    await notifyAdmin(email, ip);
  }
};
```

---

## Audit Logging

### Logged Events

| Event Type | Description |
|------------|-------------|
| `USER_LOGIN` | Successful login |
| `USER_LOGOUT` | User logout |
| `LOGIN_FAILED` | Failed login attempt |
| `PASSWORD_CHANGE` | Password changed |
| `RECORD_CREATE` | Health record created |
| `RECORD_VIEW` | Health record accessed |
| `RECORD_UPDATE` | Health record modified |
| `PREDICTION_REQUEST` | AI prediction requested |
| `REVIEW_SUBMIT` | Counselor review submitted |
| `USER_STATUS_CHANGE` | User status modified |
| `LICENSE_APPROVE` | License approved |

### Log Structure

```typescript
interface AuditLog {
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
}
```

### Log Retention

- **Active Logs**: 90 days in MongoDB
- **Archived Logs**: 7 years in cold storage (compliance)

---

## HIPAA Compliance Checklist

### Technical Safeguards

- [x] Access Control - Unique user IDs, automatic logoff
- [x] Audit Controls - Comprehensive activity logging
- [x] Integrity Controls - Hash verification for data integrity
- [x] Transmission Security - TLS encryption

### Administrative Safeguards

- [x] Security Management - Risk analysis and management
- [x] Workforce Security - Role-based access
- [x] Information Access Management - Minimum necessary access
- [x] Security Awareness Training - (To be implemented)

### Physical Safeguards

- [x] Facility Access Controls - Cloud provider controls (AWS/GCP)
- [x] Workstation Security - Managed via cloud infrastructure
- [x] Device and Media Controls - Encrypted volumes

---

## Security Incident Response

### Incident Classification

| Level | Description | Response Time |
|-------|-------------|---------------|
| Critical | Data breach, system compromise | Immediate |
| High | Failed attack, vulnerability discovered | 4 hours |
| Medium | Suspicious activity, policy violation | 24 hours |
| Low | Minor anomaly, informational | 72 hours |

### Response Procedures

1. **Detection**: Automated alerting, log monitoring
2. **Containment**: Isolate affected systems
3. **Eradication**: Remove threat, patch vulnerabilities
4. **Recovery**: Restore from backups, verify integrity
5. **Post-Incident**: Analysis, documentation, improvements

---

## Vulnerability Management

### Security Testing

- **Dependency Scanning**: npm audit, Snyk
- **Static Analysis**: ESLint security rules
- **Penetration Testing**: Annual third-party assessment
- **Bug Bounty**: (Planned for production)

### Update Policy

- **Critical Patches**: Within 24 hours
- **High Severity**: Within 7 days
- **Medium/Low**: Next release cycle

---

## Contact

For security concerns or to report vulnerabilities:

- **Security Email**: security@immunodetect.io
- **Response Time**: 24 hours for initial acknowledgment
