import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { User } from '../models/user.model';
import crypto from 'crypto';

// Generate secure state parameter for CSRF protection
export const generateState = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate PKCE code verifier
export const generateCodeVerifier = (): string => {
  return crypto.randomBytes(32).toString('base64url');
};

// Generate PKCE code challenge
export const generateCodeChallenge = (verifier: string): string => {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
};

// Initialize passport configuration
export const initializePassport = (): void => {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientID || !clientSecret) {
    console.warn('⚠️ Google OAuth credentials not configured. OAuth login will not work.');
    return;
  }

  // Configure Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/v1/auth/google/callback',
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile: Profile, done) => {
        try {
          // Extract email from profile
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email found in Google profile'), undefined);
          }

          // Check if user already exists
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            // Update last login
            user.lastLoginAt = new Date();
            user.lastLoginIP = req.ip || undefined;
            user.lastLoginDevice = req.get('User-Agent') || undefined;
            await user.save();
            
            return done(null, user);
          }

          // Check if email is already registered (but not with Google)
          const existingEmailUser = await User.findOne({ email });
          if (existingEmailUser) {
            // Link Google account to existing user
            existingEmailUser.googleId = profile.id;
            existingEmailUser.lastLoginAt = new Date();
            await existingEmailUser.save();
            return done(null, existingEmailUser);
          }

          // New user - store Google profile temporarily
          // Actual registration happens in the complete-registration endpoint
          const tempUser = {
            googleId: profile.id,
            email: email,
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            profilePicture: profile.photos?.[0]?.value || '',
            isNewUser: true,
          };

          return done(null, tempUser as any);
        } catch (error) {
          return done(error as Error, undefined);
        }
      }
    )
  );

  // Serialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user._id || user.googleId);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  console.log('✅ Passport Google OAuth configured');
};

export default passport;
