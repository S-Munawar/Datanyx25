import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { redis } from '../config/redis';
import { User, IUser } from '../models';

// Token Payload Interface
interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
}

// Token Response Interface
interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  expiresIn: number;
}

// Session Info Interface
interface SessionInfo {
  sessionId: string;
  userId: string;
  createdAt: Date;
  lastActivity: Date;
  ip?: string;
  device?: string;
}

class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
  private readonly ACCESS_TOKEN_EXPIRY = '15m';
  private readonly REFRESH_TOKEN_EXPIRY = '30d';
  private readonly REFRESH_TOKEN_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 30 days

  /**
   * Generate access and refresh tokens
   */
  async generateTokens(user: IUser): Promise<TokenResponse> {
    const sessionId = crypto.randomUUID();

    const payload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      sessionId,
    };

    // Generate access token (15 minutes)
    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
      audience: 'immunodetect-api',
      issuer: 'immunodetect-auth',
    });

    // Generate refresh token (30 days)
    const refreshToken = jwt.sign(
      { userId: user._id.toString(), sessionId },
      this.JWT_REFRESH_SECRET,
      { expiresIn: this.REFRESH_TOKEN_EXPIRY }
    );

    // Store refresh token in Redis for revocation
    try {
      if (redis) {
        await redis.setex(
          `refresh:${refreshToken}`,
          this.REFRESH_TOKEN_EXPIRY_SECONDS,
          JSON.stringify({ userId: user._id.toString(), sessionId })
        );

        // Store session info
        await redis.hset(
          `session:${sessionId}`,
          'userId', user._id.toString(),
          'createdAt', Date.now().toString(),
          'lastActivity', Date.now().toString()
        );
        await redis.expire(`session:${sessionId}`, this.REFRESH_TOKEN_EXPIRY_SECONDS);

        // Add session to user's active sessions
        await this.addUserSession(user._id.toString(), sessionId);
      }
    } catch (error) {
      console.error('Redis error during token generation:', error);
      // Continue without Redis (reduced security)
    }

    return {
      accessToken,
      refreshToken,
      sessionId,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET, {
        audience: 'immunodetect-api',
        issuer: 'immunodetect-auth',
      }) as TokenPayload;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): { userId: string; sessionId: string } {
    try {
      return jwt.verify(token, this.JWT_REFRESH_SECRET) as {
        userId: string;
        sessionId: string;
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Refresh access token with rotation
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    // Verify refresh token
    const payload = this.verifyRefreshToken(refreshToken);

    // Check if token is revoked (in Redis)
    try {
      if (redis) {
        const storedToken = await redis.get(`refresh:${refreshToken}`);
        if (!storedToken) {
          throw new Error('Refresh token revoked or expired');
        }
      }
    } catch (redisError) {
      if ((redisError as Error).message === 'Refresh token revoked or expired') {
        throw redisError;
      }
      console.error('Redis error during token refresh:', redisError);
      // Continue without Redis check (reduced security)
    }

    // Get user
    const user = await User.findById(payload.userId);
    if (!user || user.status !== 'active') {
      throw new Error('User not found or inactive');
    }

    // Revoke old refresh token
    try {
      if (redis) {
        await redis.del(`refresh:${refreshToken}`);
      }
    } catch (error) {
      console.error('Error revoking old token:', error);
    }

    // Generate new tokens
    return this.generateTokens(user);
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<void> {
    if (!redis) return;
    
    try {
      // Get session info
      const sessionData = await redis.hgetall(`session:${sessionId}`);
      if (sessionData && sessionData.userId) {
        // Remove session from user's active sessions
        await this.removeUserSession(sessionData.userId, sessionId);
      }

      // Delete session
      await redis.del(`session:${sessionId}`);

      // Find and delete associated refresh token
      const keys = await redis.keys('refresh:*');
      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.sessionId === sessionId) {
            await redis.del(key);
          }
        }
      }
    } catch (error) {
      console.error('Error revoking session:', error);
      throw error;
    }
  }

  /**
   * Revoke all sessions for a user (logout from all devices)
   */
  async revokeAllSessions(userId: string): Promise<void> {
    if (!redis) return;
    
    try {
      // Get all user sessions
      const userSessionsKey = `user:sessions:${userId}`;
      const sessions = await redis.smembers(userSessionsKey);

      // Delete each session
      for (const sessionId of sessions) {
        await redis.del(`session:${sessionId}`);
      }

      // Delete all refresh tokens for this user
      const keys = await redis.keys('refresh:*');
      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.userId === userId) {
            await redis.del(key);
          }
        }
      }

      // Clear user's session list
      await redis.del(userSessionsKey);
    } catch (error) {
      console.error('Error revoking all sessions:', error);
      throw error;
    }
  }

  /**
   * Get active sessions for a user
   */
  async getActiveSessions(userId: string): Promise<SessionInfo[]> {
    if (!redis) return [];
    
    try {
      const userSessionsKey = `user:sessions:${userId}`;
      const sessionIds = await redis.smembers(userSessionsKey);
      const sessions: SessionInfo[] = [];

      for (const sessionId of sessionIds) {
        const sessionData = await redis.hgetall(`session:${sessionId}`);
        if (sessionData && Object.keys(sessionData).length > 0) {
          sessions.push({
            sessionId,
            userId: sessionData.userId,
            createdAt: new Date(parseInt(sessionData.createdAt)),
            lastActivity: new Date(parseInt(sessionData.lastActivity)),
            ip: sessionData.ip,
            device: sessionData.device,
          });
        }
      }

      return sessions;
    } catch (error) {
      console.error('Error getting active sessions:', error);
      return [];
    }
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string, ip?: string, device?: string): Promise<void> {
    if (!redis) return;
    
    try {
      const updates: Record<string, string> = {
        lastActivity: Date.now().toString(),
      };

      if (ip) updates.ip = ip;
      if (device) updates.device = device;

      await redis.hset(`session:${sessionId}`, updates);
    } catch (error) {
      console.error('Error updating session activity:', error);
    }
  }

  /**
   * Check if session is valid
   */
  async isSessionValid(sessionId: string): Promise<boolean> {
    if (!redis) return true; // Assume valid if Redis is unavailable
    
    try {
      const exists = await redis.exists(`session:${sessionId}`);
      return exists === 1;
    } catch (error) {
      console.error('Error checking session validity:', error);
      return true; // Assume valid if Redis is unavailable
    }
  }

  /**
   * Add session to user's session list
   */
  private async addUserSession(userId: string, sessionId: string): Promise<void> {
    if (!redis) return;
    
    const userSessionsKey = `user:sessions:${userId}`;
    await redis.sadd(userSessionsKey, sessionId);
    await redis.expire(userSessionsKey, this.REFRESH_TOKEN_EXPIRY_SECONDS);
  }

  /**
   * Remove session from user's session list
   */
  private async removeUserSession(userId: string, sessionId: string): Promise<void> {
    if (!redis) return;
    
    const userSessionsKey = `user:sessions:${userId}`;
    await redis.srem(userSessionsKey, sessionId);
  }

  /**
   * Generate OAuth state parameter
   */
  generateOAuthState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Store OAuth state in Redis
   */
  async storeOAuthState(state: string): Promise<void> {
    if (!redis) return;
    
    try {
      await redis.setex(`oauth:state:${state}`, 600, state); // 10 minutes
    } catch (error) {
      console.error('Error storing OAuth state:', error);
    }
  }

  /**
   * Verify OAuth state
   */
  async verifyOAuthState(state: string): Promise<boolean> {
    if (!redis) return true; // Continue if Redis unavailable
    
    try {
      const storedState = await redis.get(`oauth:state:${state}`);
      if (storedState === state) {
        await redis.del(`oauth:state:${state}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error verifying OAuth state:', error);
      return true; // Continue if Redis unavailable
    }
  }
}

export const authService = new AuthService();
export default AuthService;
