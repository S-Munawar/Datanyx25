// User types
export type UserRole = 'patient' | 'counselor' | 'researcher' | 'admin';
export type UserStatus = 'pending' | 'active' | 'suspended' | 'banned';

export interface User {
  _id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  firstName: string;
  lastName: string;
  avatar?: string;
  isEmailVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Health Record types
export type RecordStatus = 'draft' | 'submitted' | 'under_review' | 'reviewed' | 'archived';
export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface PatientData {
  ageYears?: number;
  gender?: 'male' | 'female' | 'other';
  labALCLevel?: number;
  labIgGLevel?: number;
  familyHistory?: string;
}

export interface AIPrediction {
  diagnosis?: string;
  confidence?: number;
  riskLevel?: RiskLevel;
  geneAnalysis?: {
    type?: string;
    affectedGene?: string;
    inheritance?: string;
  };
  recommendations?: string[];
  predictedAt?: Date;
}

export interface CounselorReview {
  counselorId?: string;
  counselorName?: string;
  reviewedAt?: Date;
  status?: 'pending' | 'approved' | 'rejected';
  diagnosis?: string;
  recommendations?: string;
  riskAssessment?: RiskLevel;
  notes?: string;
  followUpDate?: Date;
}

export interface HealthRecord {
  _id: string;
  id?: string;
  recordNumber?: string;
  patientId?: string;
  patientName?: string;
  status?: RecordStatus;
  patientData?: PatientData;
  prediction?: AIPrediction;
  counselorReview?: CounselorReview;
  geneFileUrl?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// Legacy types for backward compatibility
export interface GeneExpressionData {
  cd3: number;
  cd4: number;
  cd8: number;
  cd19: number;
  cd56: number;
  igG: number;
  igA: number;
  igM: number;
  ada: number;
  pnp: number;
}

// License types
export interface License {
  _id: string;
  userId: string;
  licenseNumber: string;
  licenseType: string;
  issuingAuthority: string;
  issueDate: Date;
  expiryDate: Date;
  verificationStatus: 'pending' | 'approved' | 'rejected' | 'expired';
  documentUrl: string;
  specializations: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Profile types
export interface PatientProfile {
  userId: string;
  dateOfBirth: Date;
  bloodType?: string;
  allergies: string[];
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
  };
}

export interface CounselorProfile {
  userId: string;
  title: string;
  specializations: string[];
  yearsOfExperience: number;
  education: {
    degree: string;
    institution: string;
    year: number;
  }[];
  bio?: string;
  availability: {
    day: string;
    startTime: string;
    endTime: string;
  }[];
  currentPatientCount: number;
  maxPatientCapacity: number;
}

// Dashboard stats types
export interface PatientDashboardStats {
  totalRecords: number;
  pendingReviews: number;
  completedAssessments: number;
  upcomingAppointments: number;
  recentPredictions: AIPrediction[];
}

export interface CounselorDashboardStats {
  assignedPatients: number;
  pendingReviews: number;
  completedToday: number;
  criticalCases: number;
  weeklyReviews: number[];
}

export interface AdminDashboardStats {
  totalUsers: number;
  newUsersThisMonth: number;
  pendingLicenses: number;
  totalRecords: number;
  systemHealth: {
    apiLatency: number;
    dbStatus: string;
    mlServiceStatus: string;
  };
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// Auth types
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}
