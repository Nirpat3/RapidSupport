import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { compare } from 'bcryptjs';
import { storage } from './storage';
import type { User } from '@shared/schema';

// Configure passport local strategy
passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email: string, password: string, done) => {
    try {
      console.log('[Auth] Login attempt for email:', email);
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.log('[Auth] No user found for email:', email);
        return done(null, false, { message: 'Invalid email or password' });
      }
      
      console.log('[Auth] User found:', user.email, 'Role:', user.role);
      console.log('[Auth] Stored hash starts with:', user.password?.substring(0, 20));

      // Check password
      const isValidPassword = await compare(password, user.password);
      console.log('[Auth] Password comparison result:', isValidPassword);
      
      if (!isValidPassword) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      return done(null, userWithoutPassword);
    } catch (error) {
      return done(error);
    }
  }
));

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUser(id);
    if (!user) {
      return done(null, false);
    }
    
    // Return user without password, include organization name if available
    const { password: _, ...userWithoutPassword } = user;
    
    // Fetch organization name if user has an organizationId
    let organizationName = null;
    if (user.organizationId) {
      const org = await storage.getOrganization(user.organizationId);
      organizationName = org?.name || null;
    }
    
    done(null, { ...userWithoutPassword, organizationName });
  } catch (error) {
    done(error);
  }
});

// Middleware to check if user is authenticated
export const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
};

// Middleware to check if user has specific role
export const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

export default passport;
