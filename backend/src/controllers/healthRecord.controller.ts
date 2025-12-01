import { Request, Response, NextFunction } from 'express';
// Using global Express.Request type
import { HealthRecord, AuditLog, PatientProfile, User } from '../models';
import { v4 as uuidv4 } from 'uuid';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import s3Client, { S3_BUCKET } from '../config/s3';
import { getPrediction, checkMLServiceHealth } from '../services/mlService';

/**
 * Create Health Record
 * POST /api/v1/patient/health-records
 */
export const createHealthRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const patient = req.user!;
    const { patientData } = req.body;

    // Validate required fields
    if (!patientData || !patientData.ageYears || !patientData.gender || 
        patientData.labALCLevel === undefined || patientData.labIgGLevel === undefined) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Missing required patient data fields',
      });
      return;
    }

    // Create health record
    const healthRecord = await HealthRecord.create({
      patientId: patient._id,
      patientData: {
        ageYears: patientData.ageYears,
        gender: patientData.gender,
        familyHistory: patientData.familyHistory || false,
        consanguinity: patientData.consanguinity || false,
        infectionEarFreq: patientData.infectionEarFreq || 0,
        infectionLungFreq: patientData.infectionLungFreq || 0,
        persistentThrush: patientData.persistentThrush || 'No',
        chronicDiarrhea: patientData.chronicDiarrhea || 'No',
        failureToThrive: patientData.failureToThrive || false,
        historyIVAntibiotics: patientData.historyIVAntibiotics || false,
        labALCLevel: patientData.labALCLevel,
        labIgGLevel: patientData.labIgGLevel,
        primaryGeneSymbol: patientData.primaryGeneSymbol,
      },
      status: 'pending',
      statusHistory: [{
        status: 'pending',
        changedAt: new Date(),
        changedBy: patient._id,
        reason: 'Record created',
      }],
    });

    // Log creation
    await AuditLog.create({
      action: 'health_record.create',
      userId: patient._id,
      targetId: healthRecord._id,
      targetType: 'HealthRecord',
      description: `Patient created health record ${healthRecord.recordNumber}`,
      requestContext: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
      },
      success: true,
    });

    res.status(201).json({
      success: true,
      message: 'Health record created successfully',
      healthRecord: {
        id: healthRecord._id,
        recordNumber: healthRecord.recordNumber,
        status: healthRecord.status,
        patientData: healthRecord.patientData,
        createdAt: healthRecord.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Create health record error:', error);
    res.status(500).json({
      success: false,
      error: 'CREATE_ERROR',
      message: 'Failed to create health record',
    });
  }
};

/**
 * Get Patient's Health Records
 * GET /api/v1/patient/health-records
 */
export const getHealthRecords = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const patient = req.user!;
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query: Record<string, any> = {
      patientId: patient._id,
      isDeleted: false,
    };

    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const sort: Record<string, 1 | -1> = { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 };

    const [records, total] = await Promise.all([
      HealthRecord.find(query)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .populate('counselorReview.counselorId', 'firstName lastName profilePicture'),
      HealthRecord.countDocuments(query),
    ]);

    res.json({
      success: true,
      records: records.map((record) => ({
        id: record._id,
        recordNumber: record.recordNumber,
        status: record.status,
        patientData: record.patientData,
        prediction: record.prediction,
        counselorReview: record.counselorReview,
        hasGeneFile: !!record.geneExpressionFile,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Get health records error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch health records',
    });
  }
};

/**
 * Get Single Health Record
 * GET /api/v1/patient/health-records/:id
 */
export const getHealthRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const patient = req.user!;
    const { id } = req.params;

    const record = await HealthRecord.findOne({
      _id: id,
      patientId: patient._id,
      isDeleted: false,
    }).populate('counselorReview.counselorId', 'firstName lastName profilePicture email');

    if (!record) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Health record not found',
      });
      return;
    }

    res.json({
      success: true,
      record,
    });
  } catch (error: any) {
    console.error('Get health record error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch health record',
    });
  }
};

/**
 * Update Health Record
 * PUT /api/v1/patient/health-records/:id
 */
export const updateHealthRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const patient = req.user!;
    const { id } = req.params;
    const { patientData } = req.body;

    const record = await HealthRecord.findOne({
      _id: id,
      patientId: patient._id,
      isDeleted: false,
    });

    if (!record) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Health record not found',
      });
      return;
    }

    // Only allow updates if status is pending
    if (record.status !== 'pending') {
      res.status(400).json({
        success: false,
        error: 'UPDATE_NOT_ALLOWED',
        message: 'Cannot update record after processing has started',
      });
      return;
    }

    // Update patient data
    if (patientData) {
      Object.assign(record.patientData, patientData);
    }

    await record.save();

    // Log update
    await AuditLog.create({
      action: 'health_record.update',
      userId: patient._id,
      targetId: record._id,
      targetType: 'HealthRecord',
      description: `Patient updated health record ${record.recordNumber}`,
      requestContext: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
      },
      success: true,
    });

    res.json({
      success: true,
      message: 'Health record updated successfully',
      record: {
        id: record._id,
        recordNumber: record.recordNumber,
        status: record.status,
        patientData: record.patientData,
      },
    });
  } catch (error: any) {
    console.error('Update health record error:', error);
    res.status(500).json({
      success: false,
      error: 'UPDATE_ERROR',
      message: 'Failed to update health record',
    });
  }
};

/**
 * Delete Health Record
 * DELETE /api/v1/patient/health-records/:id
 */
export const deleteHealthRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const patient = req.user!;
    const { id } = req.params;

    const record = await HealthRecord.findOne({
      _id: id,
      patientId: patient._id,
      isDeleted: false,
    });

    if (!record) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Health record not found',
      });
      return;
    }

    // Soft delete
    record.isDeleted = true;
    record.deletedAt = new Date();
    record.deletedBy = patient._id;
    await record.save();

    // Log deletion
    await AuditLog.create({
      action: 'health_record.delete',
      userId: patient._id,
      targetId: record._id,
      targetType: 'HealthRecord',
      description: `Patient deleted health record ${record.recordNumber}`,
      requestContext: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
      },
      success: true,
    });

    res.json({
      success: true,
      message: 'Health record deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete health record error:', error);
    res.status(500).json({
      success: false,
      error: 'DELETE_ERROR',
      message: 'Failed to delete health record',
    });
  }
};

/**
 * Upload Gene Expression File
 * POST /api/v1/patient/health-records/:id/gene-file
 */
export const uploadGeneFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const patient = req.user!;
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({
        success: false,
        error: 'NO_FILE',
        message: 'No file uploaded',
      });
      return;
    }

    const record = await HealthRecord.findOne({
      _id: id,
      patientId: patient._id,
      isDeleted: false,
    });

    if (!record) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Health record not found',
      });
      return;
    }

    // Validate file type
    if (!file.mimetype.includes('csv') && !file.originalname.endsWith('.csv')) {
      res.status(400).json({
        success: false,
        error: 'INVALID_FILE_TYPE',
        message: 'Only CSV files are allowed',
      });
      return;
    }

    // Generate S3 key
    const s3Key = `gene-expressions/${patient._id}/${record.recordNumber}/${uuidv4()}-${file.originalname}`;

    // Upload to S3
    await s3Client.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ServerSideEncryption: 'AES256',
    }));

    // Update record
    record.geneExpressionFile = {
      fileName: file.originalname,
      s3Key,
      uploadedAt: new Date(),
      fileSize: file.size,
      mimeType: file.mimetype,
    };
    await record.save();

    res.json({
      success: true,
      message: 'Gene expression file uploaded successfully',
      file: {
        fileName: file.originalname,
        fileSize: file.size,
        uploadedAt: record.geneExpressionFile.uploadedAt,
      },
    });
  } catch (error: any) {
    console.error('Upload gene file error:', error);
    res.status(500).json({
      success: false,
      error: 'UPLOAD_ERROR',
      message: 'Failed to upload file',
    });
  }
};

/**
 * Get Gene File Download URL
 * GET /api/v1/patient/health-records/:id/gene-file/download
 */
export const getGeneFileDownloadUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const patient = req.user!;
    const { id } = req.params;

    const record = await HealthRecord.findOne({
      _id: id,
      patientId: patient._id,
      isDeleted: false,
    });

    if (!record || !record.geneExpressionFile) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'File not found',
      });
      return;
    }

    // Generate pre-signed URL
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: record.geneExpressionFile.s3Key,
    });

    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour

    res.json({
      success: true,
      downloadUrl,
      fileName: record.geneExpressionFile.fileName,
      expiresIn: 3600,
    });
  } catch (error: any) {
    console.error('Get download URL error:', error);
    res.status(500).json({
      success: false,
      error: 'DOWNLOAD_ERROR',
      message: 'Failed to generate download URL',
    });
  }
};

/**
 * Share Health Record
 * POST /api/v1/patient/health-records/:id/share
 */
export const shareHealthRecord = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const patient = req.user!;
    const { id } = req.params;
    const { userId, accessLevel = 'view', expiresInDays } = req.body;

    const record = await HealthRecord.findOne({
      _id: id,
      patientId: patient._id,
      isDeleted: false,
    });

    if (!record) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Health record not found',
      });
      return;
    }

    // Verify target user exists and is a valid role
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'Target user not found',
      });
      return;
    }

    if (!['counselor', 'researcher'].includes(targetUser.role)) {
      res.status(400).json({
        success: false,
        error: 'INVALID_USER',
        message: 'Can only share with counselors or researchers',
      });
      return;
    }

    // Add or update share entry
    const existingShareIndex = record.sharedWith.findIndex(
      (s) => s.userId.toString() === userId
    );

    const shareEntry = {
      userId: targetUser._id,
      sharedAt: new Date(),
      accessLevel: accessLevel as 'view' | 'edit',
      expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : undefined,
    };

    if (existingShareIndex >= 0) {
      record.sharedWith[existingShareIndex] = shareEntry;
    } else {
      record.sharedWith.push(shareEntry);
    }

    await record.save();

    // Log share
    await AuditLog.create({
      action: 'health_record.share',
      userId: patient._id,
      targetId: record._id,
      targetType: 'HealthRecord',
      description: `Patient shared health record ${record.recordNumber} with ${targetUser.email}`,
      requestContext: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
      },
      metadata: { sharedWithUserId: userId, accessLevel },
      success: true,
    });

    res.json({
      success: true,
      message: 'Health record shared successfully',
      sharedWith: {
        userId: targetUser._id,
        name: targetUser.getFullName(),
        email: targetUser.email,
        accessLevel,
        expiresAt: shareEntry.expiresAt,
      },
    });
  } catch (error: any) {
    console.error('Share health record error:', error);
    res.status(500).json({
      success: false,
      error: 'SHARE_ERROR',
      message: 'Failed to share health record',
    });
  }
};

/**
 * Request AI Prediction
 * POST /api/v1/patient/health-records/:id/predict
 */
export const requestPrediction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const patient = req.user!;
    const { id } = req.params;

    const record = await HealthRecord.findOne({
      _id: id,
      patientId: patient._id,
      isDeleted: false,
    });

    if (!record) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Health record not found',
      });
      return;
    }

    if (record.status !== 'pending') {
      res.status(400).json({
        success: false,
        error: 'ALREADY_PROCESSED',
        message: 'Record has already been processed',
      });
      return;
    }

    // Update status to processing
    record.status = 'processing';
    record.statusHistory.push({
      status: 'processing',
      changedAt: new Date(),
      changedBy: patient._id,
      reason: 'AI prediction requested',
    });
    await record.save();

    // Log prediction request
    await AuditLog.create({
      action: 'prediction.request',
      userId: patient._id,
      targetId: record._id,
      targetType: 'HealthRecord',
      description: `AI prediction requested for record ${record.recordNumber}`,
      requestContext: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
      },
      success: true,
    });

    // Call ML service for prediction
    try {
      const predictionResult = await getPrediction({
        ageYears: record.patientData.ageYears,
        gender: record.patientData.gender as 'Male' | 'Female',
        familyHistory: record.patientData.familyHistory,
        consanguinity: record.patientData.consanguinity,
        infectionEarFreq: record.patientData.infectionEarFreq,
        infectionLungFreq: record.patientData.infectionLungFreq,
        persistentThrush: record.patientData.persistentThrush,
        chronicDiarrhea: record.patientData.chronicDiarrhea,
        failureToThrive: record.patientData.failureToThrive,
        historyIVAntibiotics: record.patientData.historyIVAntibiotics,
        labALCLevel: record.patientData.labALCLevel,
        labIgGLevel: record.patientData.labIgGLevel,
        primaryGeneSymbol: record.patientData.primaryGeneSymbol,
      });

      // Map ML service response to record prediction format
      const prediction = {
        diagnosis: predictionResult.diagnosis,
        confidence: predictionResult.confidence,
        riskScore: predictionResult.riskScore,
        riskLevel: predictionResult.riskLevel,
        severity: predictionResult.riskLevel === 'critical' ? 'Critical' as const :
                  predictionResult.riskLevel === 'high' ? 'High' as const :
                  predictionResult.riskLevel === 'moderate' ? 'Moderate' as const : 'Low' as const,
        recommendedAction: predictionResult.recommendations[0] || 'Consult with healthcare provider',
        processedAt: new Date(),
        modelVersion: predictionResult.modelVersion,
        featureImportance: predictionResult.featureImportance,
      };

      record.prediction = prediction;
      record.status = 'completed';
      record.statusHistory.push({
        status: 'completed',
        changedAt: new Date(),
        reason: 'AI prediction completed',
      });
      await record.save();

      await AuditLog.create({
        action: 'prediction.complete',
        userId: patient._id,
        targetId: record._id,
        targetType: 'HealthRecord',
        description: `AI prediction completed for record ${record.recordNumber}`,
        metadata: { diagnosis: prediction.diagnosis, confidence: prediction.confidence },
        success: true,
      });

      res.json({
        success: true,
        message: 'AI prediction completed',
        status: 'completed',
        prediction: record.prediction,
      });
    } catch (predictionError: any) {
      console.error('ML prediction error:', predictionError);
      
      // Revert status on error
      record.status = 'pending';
      record.statusHistory.push({
        status: 'pending',
        changedAt: new Date(),
        reason: 'Prediction failed, status reverted',
      });
      await record.save();

      res.status(500).json({
        success: false,
        error: 'PREDICTION_ERROR',
        message: 'Failed to get prediction from ML service',
      });
    }
  } catch (error: any) {
    console.error('Request prediction error:', error);
    res.status(500).json({
      success: false,
      error: 'PREDICTION_ERROR',
      message: 'Failed to request prediction',
    });
  }
};

export default {
  createHealthRecord,
  getHealthRecords,
  getHealthRecord,
  updateHealthRecord,
  deleteHealthRecord,
  uploadGeneFile,
  getGeneFileDownloadUrl,
  shareHealthRecord,
  requestPrediction,
};
