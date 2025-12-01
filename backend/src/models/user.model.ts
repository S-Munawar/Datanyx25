import mongoose, { Document, Schema, Model } from 'mongoose';

// User Roles
export type UserRole = 'patient' | 'counselor' | 'researcher' | 'admin';

// User Status
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

// User Interface
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  googleId?: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  licenseId?: mongoose.Types.ObjectId;
  
  // Security fields
  lastLoginAt?: Date;
  lastLoginIP?: string;
  lastLoginDevice?: string;
  failedLoginAttempts: number;
  lockUntil?: Date;
  
  // Password reset
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  
  // Email verification
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  
  // Session tracking
  activeSessions: string[];
  
  // Preferences
  preferences: {
    notifications: boolean;
    emailAlerts: boolean;
    language: string;
    timezone: string;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  getFullName(): string;
  isLocked(): boolean;
  incrementFailedAttempts(): Promise<void>;
  resetFailedAttempts(): Promise<void>;
}

// User Schema
const userSchema = new Schema<IUser>(
  {
    googleId: {
      type: String,
      sparse: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      select: false, // Don't include password by default
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    profilePicture: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['patient', 'counselor', 'researcher', 'admin'],
      default: 'patient',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'pending'],
      default: 'active',
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    licenseId: {
      type: Schema.Types.ObjectId,
      ref: 'License',
    },
    lastLoginAt: {
      type: Date,
    },
    lastLoginIP: {
      type: String,
    },
    lastLoginDevice: {
      type: String,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    passwordResetToken: {
      type: String,
    },
    passwordResetExpires: {
      type: Date,
    },
    emailVerificationToken: {
      type: String,
    },
    emailVerificationExpires: {
      type: Date,
    },
    activeSessions: [{
      type: String,
    }],
    preferences: {
      notifications: { type: Boolean, default: true },
      emailAlerts: { type: Boolean, default: true },
      language: { type: String, default: 'en' },
      timezone: { type: String, default: 'UTC' },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete (ret as Record<string, unknown>).__v;
        delete (ret as Record<string, unknown>).password;
        return ret;
      },
    },
  }
);

// Indexes for performance
userSchema.index({ email: 1, status: 1 });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function (this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

// Methods
userSchema.methods.getFullName = function (): string {
  return `${this.firstName} ${this.lastName}`;
};

userSchema.methods.isLocked = function (): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

userSchema.methods.incrementFailedAttempts = async function (): Promise<void> {
  this.failedLoginAttempts += 1;
  
  // Lock account after 5 failed attempts
  if (this.failedLoginAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  }
  
  await this.save();
};

userSchema.methods.resetFailedAttempts = async function (): Promise<void> {
  this.failedLoginAttempts = 0;
  this.lockUntil = undefined;
  await this.save();
};

// Model
export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;
