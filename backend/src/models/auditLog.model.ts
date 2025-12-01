import mongoose, { Document, Schema, Model } from 'mongoose';

// Audit Log Action Types
export type AuditAction = 
  | 'user.login'
  | 'user.logout'
  | 'user.register'
  | 'user.update'
  | 'user.delete'
  | 'user.suspend'
  | 'user.activate'
  | 'license.create'
  | 'license.claim'
  | 'license.revoke'
  | 'health_record.create'
  | 'health_record.update'
  | 'health_record.delete'
  | 'health_record.share'
  | 'health_record.download'
  | 'prediction.request'
  | 'prediction.complete'
  | 'counselor.review'
  | 'admin.action'
  | 'system.error'
  | 'security.breach_attempt';

// Audit Log Interface
export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  action: AuditAction;
  userId?: mongoose.Types.ObjectId;
  targetId?: mongoose.Types.ObjectId;
  targetType?: string;
  description: string;
  
  // Request Context
  requestContext: {
    ip?: string;
    userAgent?: string;
    method?: string;
    path?: string;
    statusCode?: number;
  };
  
  // Data Changes
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  
  // Metadata
  metadata?: Record<string, any>;
  
  // Status
  success: boolean;
  errorMessage?: string;
  
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    targetType: {
      type: String,
    },
    description: {
      type: String,
      required: true,
    },
    requestContext: {
      ip: String,
      userAgent: String,
      method: String,
      path: String,
      statusCode: Number,
    },
    changes: {
      before: Schema.Types.Mixed,
      after: Schema.Types.Mixed,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    success: {
      type: Boolean,
      default: true,
    },
    errorMessage: String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete (ret as Record<string, unknown>).__v;
        return ret;
      },
    },
  }
);

// Indexes for queries
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ 'requestContext.ip': 1, createdAt: -1 });

// TTL Index - automatically delete logs older than 1 year
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export const AuditLog: Model<IAuditLog> = mongoose.model<IAuditLog>(
  'AuditLog',
  auditLogSchema
);

export default AuditLog;
