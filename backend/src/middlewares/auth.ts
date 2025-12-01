import { Request, Response, NextFunction, RequestHandler } from 'express';
import { authService } from '../services/auth.service';
import { User, IUser, UserRole, AuditLog } from '../models';

// Extend Express Request to include user and session
export interface AuthRequest extends Request {
  user?: IUser;
  sessionId?: string;
}

// Type-safe request handler that works with both Request and AuthRequest
export type AuthRequestHandler = RequestHandler;

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    // Get token from Authorization header or cookie
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.accessToken;

    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : cookieToken;

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'No authentication token provided',
      });
      return;
    }

    // Verify token
    let payload;
    try {
      payload = authService.verifyAccessToken(token);
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        res.status(401).json({
          success: false,
          error: 'TOKEN_EXPIRED',
          message: 'Access token expired, please refresh',
        });
        return;
      }
      throw error;
    }

    // Check if session is still valid
    const sessionValid = await authService.isSessionValid(payload.sessionId);
    if (!sessionValid) {
      res.status(401).json({
        success: false,
        error: 'SESSION_INVALID',
        message: 'Session expired or invalid',
      });
      return;
    }

    // Get user from database
    const user = await User.findById(payload.userId);
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      });
      return;
    }

    // Check if user is active
    if (user.status !== 'active') {
      res.status(403).json({
        success: false,
        error: 'USER_INACTIVE',
        message: `User account is ${user.status}`,
      });
      return;
    }

    // Check if user is locked
    if (user.isLocked()) {
      res.status(403).json({
        success: false,
        error: 'ACCOUNT_LOCKED',
        message: 'Account is locked due to too many failed login attempts',
      });
      return;
    }

    // Update session activity
    await authService.updateSessionActivity(
      payload.sessionId,
      req.ip,
      req.get('User-Agent')
    );

    // Attach user and session to request
    authReq.user = user;
    authReq.sessionId = payload.sessionId;

    next();
  } catch (error: any) {
    console.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Invalid authentication token',
    });
  }
};

/**
 * Authorization Middleware Factory
 * Checks if user has required role(s)
 */
export const authorize = (...allowedRoles: UserRole[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(authReq.user.role)) {
      // Log unauthorized access attempt
      AuditLog.create({
        action: 'security.breach_attempt',
        userId: authReq.user._id,
        description: `Unauthorized access attempt to ${req.method} ${req.path}`,
        requestContext: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          method: req.method,
          path: req.path,
        },
        success: false,
        errorMessage: 'Insufficient permissions',
      }).catch(console.error);

      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Insufficient permissions to access this resource',
      });
      return;
    }

    next();
  };
};

/**
 * Optional Authentication
 * Attaches user if token is valid, but doesn't require authentication
 */
export const optionalAuth: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authReq = req as AuthRequest;
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.accessToken;

    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : cookieToken;

    if (token) {
      const payload = authService.verifyAccessToken(token);
      const user = await User.findById(payload.userId);
      if (user && user.status === 'active') {
        authReq.user = user;
        authReq.sessionId = payload.sessionId;
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Rate Limiting per User
 */
export const userRateLimit = (maxRequests: number = 100, windowMs: number = 60000) => {
  const requests = new Map<string, { count: number; resetAt: number }>();

  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const key = req.user ? req.user._id.toString() : req.ip || 'unknown';
    const now = Date.now();

    const current = requests.get(key);

    if (!current || now > current.resetAt) {
      requests.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (current.count >= maxRequests) {
      res.status(429).json({
        success: false,
        error: 'RATE_LIMITED',
        message: 'Too many requests, please slow down',
        retryAfter: Math.ceil((current.resetAt - now) / 1000),
      });
      return;
    }

    current.count++;
    next();
  };
};

/**
 * Suspicious Activity Detection
 */
export const detectSuspiciousActivity = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    next();
    return;
  }

  try {
    const currentIP = req.ip;
    const currentDevice = req.get('User-Agent');
    const lastIP = req.user.lastLoginIP;

    // Check for IP change
    if (lastIP && lastIP !== currentIP) {
      await AuditLog.create({
        action: 'security.breach_attempt',
        userId: req.user._id,
        description: 'IP address changed during session',
        requestContext: {
          ip: currentIP,
          userAgent: currentDevice,
          method: req.method,
          path: req.path,
        },
        metadata: {
          previousIP: lastIP,
          newIP: currentIP,
        },
        success: true,
      });

      // Optionally send security alert email here
    }

    next();
  } catch (error) {
    console.error('Error in suspicious activity detection:', error);
    next();
  }
};

export default {
  authenticate,
  authorize,
  optionalAuth,
  userRateLimit,
  detectSuspiciousActivity,
};
