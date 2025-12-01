import mongoose, { Document, Schema, Model } from 'mongoose';

// Diagnosis Status
export type DiagnosisStatus = 'pending' | 'processing' | 'completed' | 'reviewed' | 'archived';

// Risk Level
export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

// Health Record Interface
export interface IHealthRecord extends Document {
  _id: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  recordNumber: string;
  
  // Who created the record (for assessments created by counselors/researchers)
  createdBy?: mongoose.Types.ObjectId;
  createdByRole?: 'patient' | 'counselor' | 'researcher' | 'admin';
  
  // Patient Data Input
  patientData: {
    ageYears: number;
    gender: 'Male' | 'Female';
    familyHistory: boolean;
    consanguinity: boolean;
    
    // Clinical Symptoms
    infectionEarFreq: number;
    infectionLungFreq: number;
    persistentThrush: 'No' | 'Mild' | 'Persistent';
    chronicDiarrhea: 'No' | 'Mild' | 'Chronic';
    failureToThrive: boolean;
    historyIVAntibiotics: boolean;
    
    // Lab Results
    labALCLevel: number;
    labIgGLevel: number;
    
    // Primary Gene Symbol (if known)
    primaryGeneSymbol?: string;
  };
  
  // Gene Expression File
  geneExpressionFile?: {
    fileName: string;
    s3Key: string;
    uploadedAt: Date;
    fileSize: number;
    mimeType: string;
  };
  
  // AI Prediction Results
  prediction?: {
    diagnosis: string;
    confidence: number;
    riskScore: number;
    riskLevel: RiskLevel;
    severity: 'None' | 'Low' | 'Mild' | 'Moderate' | 'High' | 'Critical';
    recommendedAction: string;
    processedAt: Date;
    modelVersion: string;
    
    // Feature Importance (XAI)
    featureImportance?: {
      feature: string;
      importance: number;
      direction: 'positive' | 'negative';
    }[];
    
    // Gene Expression Analysis
    geneAnalysis?: {
      geneSymbol: string;
      log2FoldChange: number;
      isAbnormal: boolean;
    }[];
  };
  
  // Counselor Review
  counselorReview?: {
    counselorId: mongoose.Types.ObjectId;
    reviewedAt: Date;
    notes: string;
    agreesWithAI: boolean;
    modifiedDiagnosis?: string;
    recommendations: string[];
    followUpDate?: Date;
  };
  
  // Status Tracking
  status: DiagnosisStatus;
  statusHistory: {
    status: DiagnosisStatus;
    changedAt: Date;
    changedBy?: mongoose.Types.ObjectId;
    reason?: string;
  }[];
  
  // Sharing
  sharedWith: {
    userId: mongoose.Types.ObjectId;
    sharedAt: Date;
    accessLevel: 'view' | 'edit';
    expiresAt?: Date;
  }[];
  
  // Metadata
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

const healthRecordSchema = new Schema<IHealthRecord>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recordNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    createdByRole: {
      type: String,
      enum: ['patient', 'counselor', 'researcher', 'admin'],
    },
    patientData: {
      ageYears: { type: Number, required: true, min: 0, max: 120 },
      gender: { type: String, enum: ['Male', 'Female'], required: true },
      familyHistory: { type: Boolean, default: false },
      consanguinity: { type: Boolean, default: false },
      infectionEarFreq: { type: Number, default: 0, min: 0 },
      infectionLungFreq: { type: Number, default: 0, min: 0 },
      persistentThrush: { type: String, enum: ['No', 'Mild', 'Persistent'], default: 'No' },
      chronicDiarrhea: { type: String, enum: ['No', 'Mild', 'Chronic'], default: 'No' },
      failureToThrive: { type: Boolean, default: false },
      historyIVAntibiotics: { type: Boolean, default: false },
      labALCLevel: { type: Number, required: true, min: 0 },
      labIgGLevel: { type: Number, required: true, min: 0 },
      primaryGeneSymbol: String,
    },
    geneExpressionFile: {
      fileName: String,
      s3Key: String,
      uploadedAt: Date,
      fileSize: Number,
      mimeType: String,
    },
    prediction: {
      diagnosis: String,
      confidence: { type: Number, min: 0, max: 100 },
      riskScore: { type: Number, min: 0, max: 100 },
      riskLevel: { type: String, enum: ['low', 'moderate', 'high', 'critical'] },
      severity: { type: String, enum: ['None', 'Low', 'Mild', 'Moderate', 'High', 'Critical'] },
      recommendedAction: String,
      processedAt: Date,
      modelVersion: String,
      featureImportance: [{
        feature: String,
        importance: Number,
        direction: { type: String, enum: ['positive', 'negative'] },
      }],
      geneAnalysis: [{
        geneSymbol: String,
        log2FoldChange: Number,
        isAbnormal: Boolean,
      }],
    },
    counselorReview: {
      counselorId: { type: Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: Date,
      notes: String,
      agreesWithAI: Boolean,
      modifiedDiagnosis: String,
      recommendations: [String],
      followUpDate: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'reviewed', 'archived'],
      default: 'pending',
      index: true,
    },
    statusHistory: [{
      status: { type: String, enum: ['pending', 'processing', 'completed', 'reviewed', 'archived'] },
      changedAt: { type: Date, default: Date.now },
      changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      reason: String,
    }],
    sharedWith: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      sharedAt: { type: Date, default: Date.now },
      accessLevel: { type: String, enum: ['view', 'edit'], default: 'view' },
      expiresAt: Date,
    }],
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: Date,
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
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
healthRecordSchema.index({ patientId: 1, status: 1, isDeleted: 1 });
healthRecordSchema.index({ patientId: 1, createdAt: -1 });
healthRecordSchema.index({ createdBy: 1, status: 1, isDeleted: 1 });
healthRecordSchema.index({ 'counselorReview.counselorId': 1, status: 1 });
healthRecordSchema.index({ 'prediction.diagnosis': 1 });
healthRecordSchema.index({ 'prediction.riskLevel': 1 });

// Generate record number
healthRecordSchema.pre('save', function () {
  if (!this.recordNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.recordNumber = `HR-${timestamp}-${random}`;
  }
});

export const HealthRecord: Model<IHealthRecord> = mongoose.model<IHealthRecord>(
  'HealthRecord',
  healthRecordSchema
);

export default HealthRecord;
