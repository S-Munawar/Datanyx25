import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  User,
  License,
  PatientProfile,
  CounselorProfile,
  ResearcherProfile,
  AdminProfile,
  AuditLog,
  UserRole,
} from '../models';
import mongoose from 'mongoose';

/**
 * Initiate Google OAuth Login
 * GET /api/v1/auth/google
 */
export const initiateGoogleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    // Generate state for CSRF protection
    const state = authService.generateOAuthState();
    await authService.storeOAuthState(state);

    // Build Google OAuth URL
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_CALLBACK_URL;
    const scope = encodeURIComponent('openid email profile');

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri!)}` +
      `&response_type=code` +
      `&scope=${scope}` +
      `&state=${state}` +
      `&access_type=offline` +
      `&prompt=consent`;

    // Redirect directly to Google OAuth
    res.redirect(authUrl);
  } catch (error: any) {
    console.error('Google auth initiation error:', error);
    res.status(500).json({
      success: false,
      error: 'AUTH_ERROR',
      message: 'Failed to initiate authentication',
    });
  }
};

/**
 * Handle Google OAuth Callback
 * This is handled by Passport middleware, but we need a success handler
 */
export const googleCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=Authentication failed`);
      return;
    }

    // Check if this is a new user (needs to complete registration)
    if ((user as any).isNewUser) {
      // Store temp user data in session/redis and redirect to registration
      const tempToken = Buffer.from(JSON.stringify({
        googleId: (user as any).googleId,
        email: (user as any).email,
        firstName: (user as any).firstName,
        lastName: (user as any).lastName,
        profilePicture: (user as any).profilePicture,
      })).toString('base64');

      res.redirect(`${process.env.FRONTEND_URL}/auth/complete-registration?token=${tempToken}`);
      return;
    }

    // Existing user - generate tokens
    const tokens = await authService.generateTokens(user);

    // Log the login
    await AuditLog.create({
      action: 'user.login',
      userId: user._id,
      description: `User ${user.email} logged in via Google OAuth`,
      requestContext: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
      },
      success: true,
    });

    // Set cookies (for same-origin requests)
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Redirect to callback page with token (for cross-origin localStorage storage)
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${tokens.accessToken}`);
  } catch (error: any) {
    console.error('Google callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/auth/error?message=${encodeURIComponent(error.message)}`);
  }
};

/**
 * Complete Registration
 * POST /api/v1/auth/complete-registration
 */
export const completeRegistration = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { googleProfile, role, licenseNumber, profileData } = req.body;

    // Validate Google profile
    if (!googleProfile || !googleProfile.googleId) {
      res.status(400).json({
        success: false,
        error: 'INVALID_PROFILE',
        message: 'Invalid Google profile data',
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ googleId: googleProfile.googleId });
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'USER_EXISTS',
        message: 'User already registered',
      });
      return;
    }

    // Validate license for counselor/researcher
    let license = null;
    if (role === 'counselor' || role === 'researcher') {
      if (!licenseNumber) {
        res.status(400).json({
          success: false,
          error: 'LICENSE_REQUIRED',
          message: 'License number required for this role',
        });
        return;
      }

      license = await License.findOne({
        licenseNumber: licenseNumber.toUpperCase(),
        type: role,
        status: 'available',
      });

      if (!license) {
        res.status(400).json({
          success: false,
          error: 'INVALID_LICENSE',
          message: 'Invalid or unavailable license number',
        });
        return;
      }
    }

    // Create user
    const [user] = await User.create(
      [
        {
          googleId: googleProfile.googleId,
          email: googleProfile.email,
          firstName: googleProfile.firstName,
          lastName: googleProfile.lastName,
          profilePicture: googleProfile.profilePicture,
          role,
          status: 'active',
          lastLoginAt: new Date(),
          lastLoginIP: req.ip,
          lastLoginDevice: req.get('User-Agent'),
        },
      ],
      { session }
    );

    // Claim license if applicable
    if (license) {
      license.status = 'claimed';
      license.claimedBy = user._id;
      license.claimedAt = new Date();
      await license.save({ session });

      user.licenseId = license._id;
      await user.save({ session });
    }

    // Create role-specific profile
    switch (role) {
      case 'patient':
        await PatientProfile.create(
          [
            {
              userId: user._id,
              ...profileData,
            },
          ],
          { session }
        );
        break;

      case 'counselor':
        await CounselorProfile.create(
          [
            {
              userId: user._id,
              licenseId: license!._id,
              ...profileData,
            },
          ],
          { session }
        );
        break;

      case 'researcher':
        await ResearcherProfile.create(
          [
            {
              userId: user._id,
              licenseId: license!._id,
              ...profileData,
            },
          ],
          { session }
        );
        break;

      case 'admin':
        await AdminProfile.create(
          [
            {
              userId: user._id,
              permissions: {
                manageUsers: true,
                manageLicenses: true,
                manageSystem: false,
                viewAuditLogs: true,
                manageData: false,
              },
              adminLevel: 'standard',
            },
          ],
          { session }
        );
        break;
    }

    // Commit transaction
    await session.commitTransaction();

    // Generate tokens
    const tokens = await authService.generateTokens(user);

    // Log registration
    await AuditLog.create({
      action: 'user.register',
      userId: user._id,
      description: `New ${role} user registered: ${user.email}`,
      requestContext: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
      },
      success: true,
    });

    // Set cookies
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      message: 'Registration completed successfully',
      accessToken: tokens.accessToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'REGISTRATION_ERROR',
      message: error.message || 'Registration failed',
    });
  } finally {
    session.endSession();
  }
};

/**
 * Refresh Access Token
 * POST /api/v1/auth/refresh
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshTokenFromCookie = req.cookies?.refreshToken;
    const refreshTokenFromBody = req.body?.refreshToken;
    const refreshTokenValue = refreshTokenFromCookie || refreshTokenFromBody;

    if (!refreshTokenValue) {
      res.status(401).json({
        success: false,
        error: 'NO_REFRESH_TOKEN',
        message: 'Refresh token not provided',
      });
      return;
    }

    const tokens = await authService.refreshAccessToken(refreshTokenValue);

    // Set new cookies
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    });
  } catch (error: any) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: 'REFRESH_FAILED',
      message: error.message || 'Failed to refresh token',
    });
  }
};

/**
 * Get Current User
 * GET /api/v1/auth/me
 */
export const getCurrentUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;

    // Get profile based on role
    let profile = null;
    switch (user.role) {
      case 'patient':
        profile = await PatientProfile.findOne({ userId: user._id });
        break;
      case 'counselor':
        profile = await CounselorProfile.findOne({ userId: user._id }).populate('licenseId');
        break;
      case 'researcher':
        profile = await ResearcherProfile.findOne({ userId: user._id }).populate('licenseId');
        break;
      case 'admin':
        profile = await AdminProfile.findOne({ userId: user._id });
        break;
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.getFullName(),
        profilePicture: user.profilePicture,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        preferences: user.preferences,
      },
      profile,
    });
  } catch (error: any) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch user data',
    });
  }
};

/**
 * Logout Current Session
 * POST /api/v1/auth/logout
 */
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessionId = req.sessionId;
    const user = req.user!;

    if (sessionId) {
      await authService.revokeSession(sessionId);
    }

    // Log logout
    await AuditLog.create({
      action: 'user.logout',
      userId: user._id,
      description: `User ${user.email} logged out`,
      requestContext: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
      },
      success: true,
    });

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'LOGOUT_ERROR',
      message: 'Failed to logout',
    });
  }
};

/**
 * Logout from All Devices
 * POST /api/v1/auth/logout-all
 */
export const logoutAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;

    await authService.revokeAllSessions(user._id.toString());

    // Log logout
    await AuditLog.create({
      action: 'user.logout',
      userId: user._id,
      description: `User ${user.email} logged out from all devices`,
      requestContext: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
      },
      metadata: { allDevices: true },
      success: true,
    });

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Logged out from all devices successfully',
    });
  } catch (error: any) {
    console.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      error: 'LOGOUT_ERROR',
      message: 'Failed to logout from all devices',
    });
  }
};

/**
 * Get Active Sessions
 * GET /api/v1/auth/sessions
 */
export const getActiveSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const sessions = await authService.getActiveSessions(user._id.toString());

    res.json({
      success: true,
      sessions: sessions.map((session) => ({
        ...session,
        isCurrent: session.sessionId === req.sessionId,
      })),
    });
  } catch (error: any) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch active sessions',
    });
  }
};

/**
 * Revoke Specific Session
 * DELETE /api/v1/auth/sessions/:sessionId
 */
export const revokeSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const user = req.user!;

    // Verify the session belongs to this user
    const sessions = await authService.getActiveSessions(user._id.toString());
    const sessionBelongsToUser = sessions.some((s) => s.sessionId === sessionId);

    if (!sessionBelongsToUser) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Session does not belong to this user',
      });
      return;
    }

    await authService.revokeSession(sessionId);

    res.json({
      success: true,
      message: 'Session revoked successfully',
    });
  } catch (error: any) {
    console.error('Revoke session error:', error);
    res.status(500).json({
      success: false,
      error: 'REVOKE_ERROR',
      message: 'Failed to revoke session',
    });
  }
};

/**
 * Email/Password Login
 * POST /api/v1/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Email and password are required',
      });
      return;
    }

    console.log('[DEBUG LOGIN] Attempting login for:', email.toLowerCase());
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    console.log('[DEBUG LOGIN] User found:', !!user);
    if (user) {
      console.log('[DEBUG LOGIN] User email:', user.email);
      console.log('[DEBUG LOGIN] Has password:', !!user.password);
    }
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
      return;
    }

    // Check if user has a password (might be OAuth-only)
    if (!user.password) {
      res.status(401).json({
        success: false,
        error: 'OAUTH_ONLY',
        message: 'This account uses Google sign-in. Please use Google to login.',
      });
      return;
    }

    // Check if account is locked
    if (user.isLocked()) {
      res.status(403).json({
        success: false,
        error: 'ACCOUNT_LOCKED',
        message: 'Account is locked due to too many failed login attempts. Try again later.',
      });
      return;
    }

    // Verify password
    console.log('[DEBUG LOGIN] Comparing password...');
    console.log('[DEBUG LOGIN] Password provided:', password?.substring(0, 3) + '***');
    console.log('[DEBUG LOGIN] Password hash starts with:', user.password?.substring(0, 10));
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('[DEBUG LOGIN] Password valid:', isPasswordValid);
    if (!isPasswordValid) {
      // Increment failed attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
      }
      await user.save();

      res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
      return;
    }

    // Check if user is active
    if (user.status !== 'active') {
      res.status(403).json({
        success: false,
        error: 'ACCOUNT_INACTIVE',
        message: `Your account is ${user.status}. Please contact support.`,
      });
      return;
    }

    // Reset failed attempts on successful login
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLoginAt = new Date();
    user.lastLoginIP = req.ip;
    user.lastLoginDevice = req.get('User-Agent');
    await user.save();

    // Generate tokens
    const tokens = await authService.generateTokens(user);

    // Log login
    await AuditLog.create({
      action: 'user.login',
      userId: user._id,
      description: `User ${user.email} logged in via email/password`,
      requestContext: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
      },
      success: true,
    });

    res.json({
      success: true,
      message: 'Login successful',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'LOGIN_ERROR',
      message: 'Failed to login',
    });
  }
};

/**
 * Email/Password Registration
 * POST /api/v1/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { email, password, firstName, lastName, role = 'patient', licenseNumber } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Email, password, first name, and last name are required',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid email format',
      });
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Password must be at least 8 characters long',
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'USER_EXISTS',
        message: 'An account with this email already exists',
      });
      return;
    }

    // Validate role
    const validRoles = ['patient', 'counselor', 'researcher'];
    if (!validRoles.includes(role)) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid role specified',
      });
      return;
    }

    // Validate license for counselor/researcher
    let license = null;
    if (role === 'counselor' || role === 'researcher') {
      if (!licenseNumber) {
        res.status(400).json({
          success: false,
          error: 'LICENSE_REQUIRED',
          message: 'License number is required for this role',
        });
        return;
      }

      license = await License.findOne({
        licenseNumber: licenseNumber.toUpperCase(),
        type: role,
        status: 'available',
      });

      if (!license) {
        res.status(400).json({
          success: false,
          error: 'INVALID_LICENSE',
          message: 'Invalid or unavailable license number',
        });
        return;
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const [user] = await User.create(
      [
        {
          email: email.toLowerCase(),
          password: hashedPassword,
          firstName,
          lastName,
          role,
          status: 'active',
          lastLoginAt: new Date(),
          lastLoginIP: req.ip,
          lastLoginDevice: req.get('User-Agent'),
        },
      ],
      { session }
    );

    // Claim license if applicable
    if (license) {
      license.status = 'claimed';
      license.claimedBy = user._id;
      license.claimedAt = new Date();
      await license.save({ session });

      user.licenseId = license._id;
      await user.save({ session });
    }

    // Create role-specific profile
    switch (role) {
      case 'patient':
        await PatientProfile.create([{ userId: user._id }], { session });
        break;
      case 'counselor':
        await CounselorProfile.create([{ userId: user._id, licenseId: license!._id }], { session });
        break;
      case 'researcher':
        await ResearcherProfile.create([{ userId: user._id, licenseId: license!._id }], { session });
        break;
    }

    await session.commitTransaction();

    // Generate tokens
    const tokens = await authService.generateTokens(user);

    // Log registration
    await AuditLog.create({
      action: 'user.register',
      userId: user._id,
      description: `New ${role} user registered: ${user.email}`,
      requestContext: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
      },
      success: true,
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error: any) {
    await session.abortTransaction();
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'REGISTRATION_ERROR',
      message: error.message || 'Registration failed',
    });
  } finally {
    session.endSession();
  }
};

/**
 * Forgot Password
 * POST /api/v1/auth/forgot-password
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Email is required',
      });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Always return success to prevent email enumeration
    if (!user) {
      res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link will be sent.',
      });
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store reset token (expires in 1 hour)
    user.passwordResetToken = resetTokenHash;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    // TODO: Send email with reset link
    // For now, log the token (remove in production)
    console.log(`Password reset token for ${email}: ${resetToken}`);

    // Log password reset request
    await AuditLog.create({
      action: 'user.password_reset_request',
      userId: user._id,
      description: `Password reset requested for ${user.email}`,
      requestContext: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
      },
      success: true,
    });

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link will be sent.',
      // Include token in development only
      ...(process.env.NODE_ENV === 'development' && { resetToken }),
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'RESET_ERROR',
      message: 'Failed to process password reset request',
    });
  }
};

/**
 * Reset Password
 * POST /api/v1/auth/reset-password
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Token and new password are required',
      });
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Password must be at least 8 characters long',
      });
      return;
    }

    // Hash the provided token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired reset token',
      });
      return;
    }

    // Hash new password and save
    user.password = await bcrypt.hash(password, 12);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    // Revoke all existing sessions
    await authService.revokeAllSessions(user._id.toString());

    // Log password reset
    await AuditLog.create({
      action: 'user.password_reset',
      userId: user._id,
      description: `Password reset completed for ${user.email}`,
      requestContext: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
      },
      success: true,
    });

    res.json({
      success: true,
      message: 'Password reset successful. Please login with your new password.',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'RESET_ERROR',
      message: 'Failed to reset password',
    });
  }
};

/**
 * Verify Email
 * POST /api/v1/auth/verify-email
 */
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Verification token is required',
      });
      return;
    }

    // Hash the provided token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid verification token
    const user = await User.findOne({
      emailVerificationToken: tokenHash,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired verification token',
      });
      return;
    }

    // Mark email as verified
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error: any) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      error: 'VERIFICATION_ERROR',
      message: 'Failed to verify email',
    });
  }
};

export default {
  initiateGoogleAuth,
  googleCallback,
  completeRegistration,
  refreshToken,
  getCurrentUser,
  logout,
  logoutAll,
  getActiveSessions,
  revokeSession,
  login,
  register,
  forgotPassword,
  resetPassword,
  verifyEmail,
};
