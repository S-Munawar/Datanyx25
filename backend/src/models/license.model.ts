import mongoose, { Document, Schema, Model } from 'mongoose';

// License Types
export type LicenseType = 'counselor' | 'researcher';
export type LicenseStatus = 'available' | 'claimed' | 'expired' | 'revoked';

// License Interface
export interface ILicense extends Document {
  _id: mongoose.Types.ObjectId;
  licenseNumber: string;
  type: LicenseType;
  status: LicenseStatus;
  claimedBy?: mongoose.Types.ObjectId;
  claimedAt?: Date;
  expiresAt?: Date;
  issuedBy?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  isValid(): boolean;
  claim(userId: mongoose.Types.ObjectId): Promise<void>;
  revoke(reason?: string): Promise<void>;
}

// License Schema
const licenseSchema = new Schema<ILicense>(
  {
    licenseNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['counselor', 'researcher'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['available', 'claimed', 'expired', 'revoked'],
      default: 'available',
      index: true,
    },
    claimedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    claimedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    issuedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete (ret as Record<string, unknown>).__v;
        return ret;
      },
    },
  }
);

// Indexes
licenseSchema.index({ licenseNumber: 1, type: 1 });
licenseSchema.index({ status: 1, type: 1 });
licenseSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Methods
licenseSchema.methods.isValid = function (): boolean {
  if (this.status !== 'available' && this.status !== 'claimed') {
    return false;
  }
  
  if (this.expiresAt && this.expiresAt < new Date()) {
    return false;
  }
  
  return true;
};

licenseSchema.methods.claim = async function (userId: mongoose.Types.ObjectId): Promise<void> {
  if (this.status !== 'available') {
    throw new Error('License is not available');
  }
  
  this.status = 'claimed';
  this.claimedBy = userId;
  this.claimedAt = new Date();
  await this.save();
};

licenseSchema.methods.revoke = async function (reason?: string): Promise<void> {
  this.status = 'revoked';
  if (reason) {
    this.notes = `Revoked: ${reason}`;
  }
  await this.save();
};

// Static methods
licenseSchema.statics.generateLicenseNumber = function (type: LicenseType): string {
  const prefix = type === 'counselor' ? 'CLR' : 'RSR';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

// Model
export const License: Model<ILicense> = mongoose.model<ILicense>('License', licenseSchema);

export default License;
