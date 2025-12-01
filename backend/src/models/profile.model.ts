import mongoose, { Document, Schema, Model } from 'mongoose';

// Patient Profile Interface
export interface IPatientProfile extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  
  // Personal Information
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  bloodType?: string;
  
  // Contact Information
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  
  // Emergency Contact
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  
  // Medical History
  medicalHistory?: {
    familyHistory?: boolean;
    consanguinity?: boolean;
    chronicConditions?: string[];
    allergies?: string[];
    medications?: string[];
    previousDiagnoses?: string[];
  };
  
  // Assigned Counselor
  assignedCounselorId?: mongoose.Types.ObjectId;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const patientProfileSchema = new Schema<IPatientProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    bloodType: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'USA' },
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
    },
    medicalHistory: {
      familyHistory: { type: Boolean, default: false },
      consanguinity: { type: Boolean, default: false },
      chronicConditions: [String],
      allergies: [String],
      medications: [String],
      previousDiagnoses: [String],
    },
    assignedCounselorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
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
patientProfileSchema.index({ userId: 1, assignedCounselorId: 1 });

export const PatientProfile: Model<IPatientProfile> = mongoose.model<IPatientProfile>(
  'PatientProfile',
  patientProfileSchema
);

// Counselor Profile Interface
export interface ICounselorProfile extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  licenseId: mongoose.Types.ObjectId;
  
  // Professional Information
  specialization?: string[];
  yearsOfExperience?: number;
  institution?: string;
  department?: string;
  
  // Credentials
  credentials?: {
    degree?: string;
    university?: string;
    yearGraduated?: number;
  }[];
  
  // Availability
  availability?: {
    dayOfWeek: number; // 0-6
    startTime: string; // HH:mm
    endTime: string;
  }[];
  
  // Patient Management
  maxPatients?: number;
  currentPatientCount: number;
  
  // Statistics
  stats: {
    totalPatientsServed: number;
    totalDiagnosesReviewed: number;
    averageRating: number;
    totalRatings: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const counselorProfileSchema = new Schema<ICounselorProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    licenseId: {
      type: Schema.Types.ObjectId,
      ref: 'License',
      required: true,
      index: true,
    },
    specialization: [{
      type: String,
    }],
    yearsOfExperience: {
      type: Number,
      min: 0,
    },
    institution: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    credentials: [{
      degree: String,
      university: String,
      yearGraduated: Number,
    }],
    availability: [{
      dayOfWeek: { type: Number, min: 0, max: 6 },
      startTime: String,
      endTime: String,
    }],
    maxPatients: {
      type: Number,
      default: 50,
    },
    currentPatientCount: {
      type: Number,
      default: 0,
    },
    stats: {
      totalPatientsServed: { type: Number, default: 0 },
      totalDiagnosesReviewed: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      totalRatings: { type: Number, default: 0 },
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

export const CounselorProfile: Model<ICounselorProfile> = mongoose.model<ICounselorProfile>(
  'CounselorProfile',
  counselorProfileSchema
);

// Researcher Profile Interface
export interface IResearcherProfile extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  licenseId: mongoose.Types.ObjectId;
  
  // Professional Information
  researchFocus?: string[];
  institution?: string;
  department?: string;
  orcidId?: string;
  
  // Credentials
  credentials?: {
    degree?: string;
    university?: string;
    yearGraduated?: number;
  }[];
  
  // Publications
  publications?: {
    title: string;
    journal?: string;
    year?: number;
    doi?: string;
  }[];
  
  // Data Access
  dataAccessLevel: 'basic' | 'advanced' | 'full';
  approvedDatasets: mongoose.Types.ObjectId[];
  
  // Statistics
  stats: {
    totalProjectsCreated: number;
    totalDatasetsAccessed: number;
    totalPublications: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const researcherProfileSchema = new Schema<IResearcherProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    licenseId: {
      type: Schema.Types.ObjectId,
      ref: 'License',
      required: true,
      index: true,
    },
    researchFocus: [{
      type: String,
    }],
    institution: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      trim: true,
    },
    orcidId: {
      type: String,
      trim: true,
    },
    credentials: [{
      degree: String,
      university: String,
      yearGraduated: Number,
    }],
    publications: [{
      title: { type: String, required: true },
      journal: String,
      year: Number,
      doi: String,
    }],
    dataAccessLevel: {
      type: String,
      enum: ['basic', 'advanced', 'full'],
      default: 'basic',
    },
    approvedDatasets: [{
      type: Schema.Types.ObjectId,
      ref: 'Dataset',
    }],
    stats: {
      totalProjectsCreated: { type: Number, default: 0 },
      totalDatasetsAccessed: { type: Number, default: 0 },
      totalPublications: { type: Number, default: 0 },
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

export const ResearcherProfile: Model<IResearcherProfile> = mongoose.model<IResearcherProfile>(
  'ResearcherProfile',
  researcherProfileSchema
);

// Admin Profile Interface
export interface IAdminProfile extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  
  // Admin Permissions
  permissions: {
    manageUsers: boolean;
    manageLicenses: boolean;
    manageSystem: boolean;
    viewAuditLogs: boolean;
    manageData: boolean;
  };
  
  // Admin Level
  adminLevel: 'super' | 'standard' | 'readonly';
  
  // Statistics
  stats: {
    totalActionsPerformed: number;
    lastActionAt: Date;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const adminProfileSchema = new Schema<IAdminProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    permissions: {
      manageUsers: { type: Boolean, default: true },
      manageLicenses: { type: Boolean, default: true },
      manageSystem: { type: Boolean, default: false },
      viewAuditLogs: { type: Boolean, default: true },
      manageData: { type: Boolean, default: false },
    },
    adminLevel: {
      type: String,
      enum: ['super', 'standard', 'readonly'],
      default: 'standard',
    },
    stats: {
      totalActionsPerformed: { type: Number, default: 0 },
      lastActionAt: Date,
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

export const AdminProfile: Model<IAdminProfile> = mongoose.model<IAdminProfile>(
  'AdminProfile',
  adminProfileSchema
);
