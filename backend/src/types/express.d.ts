/* eslint-disable @typescript-eslint/no-unused-vars */
import { IUser } from '../models/user.model';

// Augment Express namespace to override the User type
declare global {
  namespace Express {
    // Override the User interface to match our IUser
    interface User extends IUser {}
    
    export interface Request {
      user?: IUser;
      sessionId?: string;
    }
  }
}

export {};
