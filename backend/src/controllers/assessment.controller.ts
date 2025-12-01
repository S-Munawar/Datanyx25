import { Request, Response, NextFunction } from 'express';
import { HealthRecord, AuditLog, User } from '../models';
import { getPrediction, checkMLServiceHealth } from '../services/mlService';

/**
 * Create Health Assessment (for Counselors and Researchers)
 * POST /api/v1/counselor/assessments or /api/v1/researcher/assessments
 */
export const createAssessment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const creator = req.user!;
    const { patientId, patientData, runPrediction = true } = req.body;

    // Validate required fields
    if (!patientId) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Patient ID is required',
      });
      return;
    }

    if (!patientData || !patientData.ageYears || !patientData.gender || 
        patientData.labALCLevel === undefined || patientData.labIgGLevel === undefined) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Missing required patient data fields (ageYears, gender, labALCLevel, labIgGLevel)',
      });
      return;
    }

    // Verify patient exists
    const patient = await User.findOne({ _id: patientId, role: 'patient', isActive: true });
    if (!patient) {
      res.status(404).json({
        success: false,
        error: 'PATIENT_NOT_FOUND',
        message: 'Patient not found',
      });
      return;
    }

    // Create health record
    const healthRecord = await HealthRecord.create({
      patientId: patient._id,
      createdBy: creator._id,
      createdByRole: creator.role,
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
      status: runPrediction ? 'processing' : 'pending',
      statusHistory: [{
        status: runPrediction ? 'processing' : 'pending',
        changedAt: new Date(),
        changedBy: creator._id,
        reason: `Assessment created by ${creator.role}`,
      }],
      // Automatically share with creator
      sharedWith: [{
        userId: creator._id,
        sharedAt: new Date(),
        accessLevel: 'edit',
      }],
    });

    // Log creation
    await AuditLog.create({
      action: 'assessment.create',
      userId: creator._id,
      targetId: healthRecord._id,
      targetType: 'HealthRecord',
      description: `${creator.role} created assessment ${healthRecord.recordNumber} for patient ${patient.email}`,
      requestContext: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
      },
      metadata: { patientId: patient._id },
      success: true,
    });

    // Run prediction if requested
    if (runPrediction) {
      try {
        const predictionResult = await getPrediction({
          ageYears: patientData.ageYears,
          gender: patientData.gender as 'Male' | 'Female',
          familyHistory: patientData.familyHistory,
          consanguinity: patientData.consanguinity,
          infectionEarFreq: patientData.infectionEarFreq,
          infectionLungFreq: patientData.infectionLungFreq,
          persistentThrush: patientData.persistentThrush,
          chronicDiarrhea: patientData.chronicDiarrhea,
          failureToThrive: patientData.failureToThrive,
          historyIVAntibiotics: patientData.historyIVAntibiotics,
          labALCLevel: patientData.labALCLevel,
          labIgGLevel: patientData.labIgGLevel,
          primaryGeneSymbol: patientData.primaryGeneSymbol,
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

        healthRecord.prediction = prediction;
        healthRecord.status = 'completed';
        healthRecord.statusHistory.push({
          status: 'completed',
          changedAt: new Date(),
          reason: 'AI prediction completed',
        });
        await healthRecord.save();

        await AuditLog.create({
          action: 'prediction.complete',
          userId: creator._id,
          targetId: healthRecord._id,
          targetType: 'HealthRecord',
          description: `AI prediction completed for assessment ${healthRecord.recordNumber}`,
          metadata: { diagnosis: prediction.diagnosis, confidence: prediction.confidence },
          success: true,
        });

        res.status(201).json({
          success: true,
          message: 'Assessment created with prediction results',
          assessment: {
            id: healthRecord._id,
            recordNumber: healthRecord.recordNumber,
            status: healthRecord.status,
            patientData: healthRecord.patientData,
            prediction: healthRecord.prediction,
            patient: {
              id: patient._id,
              name: patient.getFullName(),
              email: patient.email,
            },
            createdAt: healthRecord.createdAt,
          },
        });
      } catch (predictionError: any) {
        console.error('ML prediction error:', predictionError);
        
        // Keep the record but mark as pending for manual review
        healthRecord.status = 'pending';
        healthRecord.statusHistory.push({
          status: 'pending',
          changedAt: new Date(),
          reason: 'Prediction failed, awaiting manual processing',
        });
        await healthRecord.save();

        res.status(201).json({
          success: true,
          message: 'Assessment created but prediction failed. Record saved for manual processing.',
          assessment: {
            id: healthRecord._id,
            recordNumber: healthRecord.recordNumber,
            status: healthRecord.status,
            patientData: healthRecord.patientData,
            patient: {
              id: patient._id,
              name: patient.getFullName(),
              email: patient.email,
            },
            createdAt: healthRecord.createdAt,
          },
          warning: 'ML service unavailable, prediction not generated',
        });
      }
    } else {
      res.status(201).json({
        success: true,
        message: 'Assessment created successfully',
        assessment: {
          id: healthRecord._id,
          recordNumber: healthRecord.recordNumber,
          status: healthRecord.status,
          patientData: healthRecord.patientData,
          patient: {
            id: patient._id,
            name: patient.getFullName(),
            email: patient.email,
          },
          createdAt: healthRecord.createdAt,
        },
      });
    }
  } catch (error: any) {
    console.error('Create assessment error:', error);
    res.status(500).json({
      success: false,
      error: 'CREATE_ERROR',
      message: 'Failed to create assessment',
    });
  }
};

/**
 * Get Assessments Created by Current User
 * GET /api/v1/counselor/assessments or /api/v1/researcher/assessments
 */
export const getAssessments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Find records created by this user or shared with this user
    const query: Record<string, any> = {
      isDeleted: false,
      $or: [
        { createdBy: user._id },
        { 'sharedWith.userId': user._id },
      ],
    };

    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const sort: Record<string, 1 | -1> = { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 };

    const [records, total] = await Promise.all([
      HealthRecord.find(query)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .populate('patientId', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName'),
      HealthRecord.countDocuments(query),
    ]);

    res.json({
      success: true,
      assessments: records.map((record) => ({
        id: record._id,
        recordNumber: record.recordNumber,
        status: record.status,
        patientData: record.patientData,
        prediction: record.prediction,
        patient: record.patientId,
        createdBy: record.createdBy,
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
    console.error('Get assessments error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch assessments',
    });
  }
};

/**
 * Get Single Assessment
 * GET /api/v1/counselor/assessments/:id or /api/v1/researcher/assessments/:id
 */
export const getAssessment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const record = await HealthRecord.findOne({
      _id: id,
      isDeleted: false,
      $or: [
        { createdBy: user._id },
        { 'sharedWith.userId': user._id },
        // Counselors can view all records for review
        ...(user.role === 'counselor' ? [{ status: { $in: ['completed', 'under_review'] } }] : []),
      ],
    })
      .populate('patientId', 'firstName lastName email profilePicture')
      .populate('createdBy', 'firstName lastName email')
      .populate('counselorReview.counselorId', 'firstName lastName');

    if (!record) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Assessment not found or access denied',
      });
      return;
    }

    res.json({
      success: true,
      assessment: record,
    });
  } catch (error: any) {
    console.error('Get assessment error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch assessment',
    });
  }
};

/**
 * Request Prediction for Assessment
 * POST /api/v1/counselor/assessments/:id/predict or /api/v1/researcher/assessments/:id/predict
 */
export const requestAssessmentPrediction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const record = await HealthRecord.findOne({
      _id: id,
      isDeleted: false,
      $or: [
        { createdBy: user._id },
        { 'sharedWith.userId': user._id, 'sharedWith.accessLevel': 'edit' },
      ],
    });

    if (!record) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Assessment not found or access denied',
      });
      return;
    }

    if (record.status === 'completed' && record.prediction) {
      res.status(400).json({
        success: false,
        error: 'ALREADY_PROCESSED',
        message: 'Assessment already has a prediction',
      });
      return;
    }

    // Update status to processing
    record.status = 'processing';
    record.statusHistory.push({
      status: 'processing',
      changedAt: new Date(),
      changedBy: user._id,
      reason: 'AI prediction requested',
    });
    await record.save();

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
        userId: user._id,
        targetId: record._id,
        targetType: 'HealthRecord',
        description: `AI prediction completed for assessment ${record.recordNumber}`,
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

/**
 * Get Available Patients (for creating assessments)
 * GET /api/v1/counselor/patients or /api/v1/researcher/patients
 */
export const getAvailablePatients = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, page = 1, limit = 20 } = req.query;

    const query: Record<string, any> = {
      role: 'patient',
      isActive: true,
    };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [patients, total] = await Promise.all([
      User.find(query)
        .select('firstName lastName email profilePicture createdAt')
        .sort({ firstName: 1, lastName: 1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      patients: patients.map((p) => ({
        id: p._id,
        name: p.getFullName(),
        email: p.email,
        profilePicture: p.profilePicture,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Get patients error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch patients',
    });
  }
};

/**
 * Check ML Service Health
 * GET /api/v1/counselor/ml-status or /api/v1/researcher/ml-status
 */
export const getMLStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const isHealthy = await checkMLServiceHealth();
    
    res.json({
      success: true,
      mlService: {
        available: isHealthy,
        message: isHealthy ? 'ML service is operational' : 'ML service is unavailable',
      },
    });
  } catch (error: any) {
    res.json({
      success: true,
      mlService: {
        available: false,
        message: 'Unable to check ML service status',
      },
    });
  }
};

export default {
  createAssessment,
  getAssessments,
  getAssessment,
  requestAssessmentPrediction,
  getAvailablePatients,
  getMLStatus,
};
