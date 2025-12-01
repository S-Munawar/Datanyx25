import { Request, Response, NextFunction } from 'express';
import { getPrediction, checkMLServiceHealth, PredictionResult } from '../services/mlService';
import HealthRecord from '../models/healthRecord.model';
import User from '../models/user.model';
import mongoose from 'mongoose';

// Generate unique record number
const generateRecordNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `HR-${timestamp}-${random}`;
};

/**
 * Create Assessment with ML Prediction
 * POST /api/v1/assessment
 */
export const createAssessment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { patientData, runPrediction = true, patientId: providedPatientId } = req.body;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!patientData) {
      res.status(400).json({
        success: false,
        error: 'MISSING_DATA',
        message: 'Patient data is required',
      });
      return;
    }

    // Run ML prediction if requested
    let predictionResult: PredictionResult | null = null;
    if (runPrediction) {
      try {
        predictionResult = await getPrediction(patientData);
      } catch (err) {
        console.error('Prediction error:', err);
        // Continue without prediction
      }
    }

    // Determine the patient ID
    let targetPatientId = providedPatientId || userId;
    
    // If no patient ID, we need to create or use a placeholder
    if (!targetPatientId) {
      // For anonymous users, create a temporary patient record
      const tempPatient = new User({
        firstName: 'Anonymous',
        lastName: 'Patient',
        email: `anon-${Date.now()}@temp.immunodetect.local`,
        password: 'not-applicable-' + Date.now(),
        role: 'patient',
        status: 'active',
        isVerified: false,
      });
      await tempPatient.save();
      targetPatientId = tempPatient._id;
    }

    // Map prediction to schema format
    const prediction = predictionResult ? {
      diagnosis: predictionResult.diagnosis,
      confidence: predictionResult.confidence,
      riskScore: predictionResult.riskScore,
      riskLevel: predictionResult.riskLevel,
      severity: mapRiskToSeverity(predictionResult.riskLevel),
      recommendedAction: predictionResult.recommendations?.[0] || 'Consult with healthcare provider',
      processedAt: new Date(),
      modelVersion: predictionResult.modelVersion || '1.0.0',
      featureImportance: predictionResult.featureImportance || [],
    } : undefined;

    // Create health record with proper schema
    const healthRecord = new HealthRecord({
      patientId: targetPatientId,
      recordNumber: generateRecordNumber(),
      createdBy: userId || targetPatientId,
      createdByRole: mapToValidRole(userRole),
      patientData: {
        ageYears: patientData.ageYears || 1,
        gender: patientData.gender || 'Male',
        familyHistory: patientData.familyHistory || false,
        consanguinity: patientData.consanguinity || false,
        infectionEarFreq: patientData.infectionEarFreq || 0,
        infectionLungFreq: patientData.infectionLungFreq || 0,
        persistentThrush: mapThrushValue(patientData.persistentThrush),
        chronicDiarrhea: mapDiarrheaValue(patientData.chronicDiarrhea),
        failureToThrive: patientData.failureToThrive || false,
        historyIVAntibiotics: patientData.historyIVAntibiotics || false,
        labALCLevel: patientData.labALCLevel || 1500,
        labIgGLevel: patientData.labIgGLevel || 600,
        primaryGeneSymbol: patientData.primaryGeneSymbol || undefined,
      },
      prediction,
      status: 'completed',
    });

    await healthRecord.save();

    res.status(201).json({
      success: true,
      message: 'Assessment created successfully',
      assessment: {
        id: healthRecord._id,
        recordNumber: healthRecord.recordNumber,
        status: healthRecord.status,
        createdAt: healthRecord.createdAt,
      },
      prediction: predictionResult,
    });
  } catch (error: any) {
    console.error('Create assessment error:', error);
    res.status(500).json({
      success: false,
      error: 'CREATE_ERROR',
      message: error.message || 'Failed to create assessment',
    });
  }
};

// Helper functions
function mapRiskToSeverity(riskLevel: string): 'None' | 'Low' | 'Mild' | 'Moderate' | 'High' | 'Critical' {
  const map: Record<string, 'None' | 'Low' | 'Mild' | 'Moderate' | 'High' | 'Critical'> = {
    'low': 'Low',
    'moderate': 'Moderate',
    'high': 'High',
    'critical': 'Critical',
  };
  return map[riskLevel] || 'None';
}

function mapToValidRole(role: string | undefined): 'patient' | 'counselor' | 'researcher' | 'admin' {
  const validRoles = ['patient', 'counselor', 'researcher', 'admin'];
  if (role && validRoles.includes(role)) {
    return role as 'patient' | 'counselor' | 'researcher' | 'admin';
  }
  return 'patient';
}

function mapThrushValue(value: any): 'No' | 'Mild' | 'Persistent' {
  if (value === 'Persistent' || value === true || value === 'Yes') return 'Persistent';
  if (value === 'Mild') return 'Mild';
  return 'No';
}

function mapDiarrheaValue(value: any): 'No' | 'Mild' | 'Chronic' {
  if (value === 'Chronic' || value === true || value === 'Yes') return 'Chronic';
  if (value === 'Mild') return 'Mild';
  return 'No';
}

/**
 * Get Prediction Only (without saving)
 * POST /api/v1/assessment/predict
 */
export const getPredictionOnly = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { patientData } = req.body;

    if (!patientData) {
      res.status(400).json({
        success: false,
        error: 'MISSING_DATA',
        message: 'Patient data is required',
      });
      return;
    }

    const prediction = await getPrediction(patientData);

    res.json({
      success: true,
      prediction,
    });
  } catch (error: any) {
    console.error('Prediction error:', error);
    res.status(500).json({
      success: false,
      error: 'PREDICTION_ERROR',
      message: error.message || 'Failed to get prediction',
    });
  }
};

/**
 * Check ML Service Status
 * GET /api/v1/assessment/ml-status
 */
export const getMLStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const isHealthy = await checkMLServiceHealth();
    
    res.json({
      success: true,
      status: isHealthy ? 'available' : 'unavailable',
      message: isHealthy
        ? 'ML service is available'
        : 'ML service is unavailable, fallback predictions will be used',
    });
  } catch (error: any) {
    res.json({
      success: true,
      status: 'unavailable',
      message: 'ML service is unavailable, fallback predictions will be used',
    });
  }
};

/**
 * Get All Assessments
 * GET /api/v1/assessment
 */
export const getAssessments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    const query: any = { isDeleted: false };
    
    // If patient, only show their own assessments
    if (userRole === 'patient') {
      query.patientId = userId;
    }
    
    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [assessments, total] = await Promise.all([
      HealthRecord.find(query)
        .populate('patientId', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      HealthRecord.countDocuments(query),
    ]);

    res.json({
      success: true,
      assessments: assessments.map((a: any) => ({
        id: a._id,
        recordNumber: a.recordNumber,
        status: a.status,
        diagnosis: a.prediction?.diagnosis,
        confidence: a.prediction?.confidence,
        riskLevel: a.prediction?.riskLevel,
        patient: a.patientId,
        createdBy: a.createdBy,
        createdAt: a.createdAt,
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
 * Get Assessment by ID
 * GET /api/v1/assessment/:id
 */
export const getAssessmentById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const assessment = await HealthRecord.findById(id)
      .populate('patientId', 'firstName lastName email dateOfBirth')
      .populate('createdBy', 'firstName lastName');

    if (!assessment) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Assessment not found',
      });
      return;
    }

    res.json({
      success: true,
      assessment: {
        id: assessment._id,
        recordNumber: assessment.recordNumber,
        status: assessment.status,
        patient: assessment.patientId,
        createdBy: assessment.createdBy,
        createdAt: assessment.createdAt,
        patientData: assessment.patientData,
        prediction: assessment.prediction,
      },
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
 * Get Available Patients (for all roles)
 * GET /api/v1/assessment/patients
 */
export const getAvailablePatients = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { search, page = 1, limit = 20 } = req.query;

    const query: any = { 
      role: 'patient',
      status: 'active',
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
        .select('firstName lastName email profilePicture')
        .sort({ firstName: 1, lastName: 1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      patients: patients.map((p) => ({
        id: p._id,
        name: `${p.firstName} ${p.lastName}`,
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

export default {
  createAssessment,
  getPredictionOnly,
  getMLStatus,
  getAssessments,
  getAssessmentById,
  getAvailablePatients,
};
