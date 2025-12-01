import mongoose, { Document, Schema, Model } from 'mongoose';

// Generated Credentials Interface
export interface IGeneratedCredential extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  email: string;
  password: string; // Plain text password (for test accounts only!)
  role: 'patient' | 'counselor' | 'researcher' | 'admin';
  firstName: string;
  lastName: string;
  licenseNumber?: string;
  createdAt: Date;
  expiresAt?: Date;
  notes?: string;
}

// Schema
const generatedCredentialSchema = new Schema<IGeneratedCredential>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['patient', 'counselor', 'researcher', 'admin'],
      required: true,
      index: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    licenseNumber: {
      type: String,
    },
    expiresAt: {
      type: Date,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying
generatedCredentialSchema.index({ role: 1, createdAt: -1 });

// Model
export const GeneratedCredential: Model<IGeneratedCredential> = mongoose.model<IGeneratedCredential>(
  'GeneratedCredential',
  generatedCredentialSchema
);

export default GeneratedCredential;
