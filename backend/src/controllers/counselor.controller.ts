import { Request, Response, NextFunction } from 'express';
// Using global Express.Request type
import { HealthRecord, User, PatientProfile, CounselorProfile, AuditLog } from '../models';

/**
 * Get Counselor's Assigned Patients
 * GET /api/v1/counselor/patients
 */
export const getAssignedPatients = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const counselor = req.user!;
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Get patient profiles assigned to this counselor
    const patientProfiles = await PatientProfile.find({
      assignedCounselorId: counselor._id,
    }).select('userId');

    const patientIds = patientProfiles.map((p) => p.userId);

    // Build query
    const query: Record<string, any> = {
      _id: { $in: patientIds },
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
    const sort: Record<string, 1 | -1> = { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 };

    const [patients, total] = await Promise.all([
      User.find(query)
        .select('firstName lastName email profilePicture createdAt')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query),
    ]);

    // Get health record counts for each patient
    const patientsWithRecords = await Promise.all(
      patients.map(async (patient) => {
        const recordCount = await HealthRecord.countDocuments({
          patientId: patient._id,
          isDeleted: false,
        });
        const pendingCount = await HealthRecord.countDocuments({
          patientId: patient._id,
          status: { $in: ['pending', 'completed'] },
          'counselorReview.counselorId': { $exists: false },
          isDeleted: false,
        });

        return {
          id: patient._id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          email: patient.email,
          profilePicture: patient.profilePicture,
          createdAt: patient.createdAt,
          totalRecords: recordCount,
          pendingReviews: pendingCount,
        };
      })
    );

    res.json({
      success: true,
      patients: patientsWithRecords,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Get assigned patients error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch patients',
    });
  }
};

/**
 * Get Patient's Health Records (for counselor)
 * GET /api/v1/counselor/patients/:patientId/records
 */
export const getPatientRecords = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const counselor = req.user!;
    const { patientId } = req.params;
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Verify counselor is assigned to this patient
    const patientProfile = await PatientProfile.findOne({
      userId: patientId,
      assignedCounselorId: counselor._id,
    });

    // Also check if record is shared with counselor
    const sharedRecords = await HealthRecord.find({
      patientId,
      'sharedWith.userId': counselor._id,
      isDeleted: false,
    });

    if (!patientProfile && sharedRecords.length === 0) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Not authorized to view this patient\'s records',
      });
      return;
    }

    const query: Record<string, any> = {
      patientId,
      isDeleted: false,
    };

    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const sort: Record<string, 1 | -1> = { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 };

    const [records, total] = await Promise.all([
      HealthRecord.find(query)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
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
    console.error('Get patient records error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch patient records',
    });
  }
};

/**
 * Get Record by ID
 * GET /api/v1/counselor/records/:recordId
 */
export const getRecordById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const counselor = req.user!;
    const { recordId } = req.params;

    // Get record
    const record = await HealthRecord.findById(recordId)
      .populate('patientId', 'firstName lastName email profilePicture');

    if (!record) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Health record not found',
      });
      return;
    }

    // Verify counselor is assigned to this patient or record is shared
    const patientProfile = await PatientProfile.findOne({
      userId: record.patientId,
      assignedCounselorId: counselor._id,
    });

    const isShared = record.sharedWith.some(
      (s) => s.userId.toString() === counselor._id.toString()
    );

    if (!patientProfile && !isShared) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Not authorized to view this record',
      });
      return;
    }

    res.json({
      success: true,
      record: {
        id: record._id,
        _id: record._id,
        recordNumber: record.recordNumber,
        status: record.status,
        patient: record.patientId,
        patientData: record.patientData,
        prediction: record.prediction,
        counselorReview: record.counselorReview,
        hasGeneFile: !!record.geneExpressionFile,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Get record by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch record',
    });
  }
};

/**
 * Get Pending Reviews
 * GET /api/v1/counselor/reviews/pending
 */
export const getPendingReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const counselor = req.user!;
    const { page = 1, limit = 10, riskLevel } = req.query;

    // Get assigned patients
    const patientProfiles = await PatientProfile.find({
      assignedCounselorId: counselor._id,
    }).select('userId');

    const patientIds = patientProfiles.map((p) => p.userId);

    // Find records that need review
    const query: Record<string, any> = {
      patientId: { $in: patientIds },
      status: 'completed',
      'counselorReview.counselorId': { $exists: false },
      isDeleted: false,
    };

    // Add risk level filter if provided
    if (riskLevel) {
      query['prediction.riskLevel'] = riskLevel;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [records, total] = await Promise.all([
      HealthRecord.find(query)
        .sort({ 'prediction.riskLevel': -1, createdAt: 1 }) // High risk first, then oldest
        .skip(skip)
        .limit(Number(limit))
        .populate('patientId', 'firstName lastName email profilePicture'),
      HealthRecord.countDocuments(query),
    ]);

    res.json({
      success: true,
      reviews: records.map((record) => ({
        id: record._id,
        _id: record._id,
        recordNumber: record.recordNumber,
        patient: record.patientId,
        patientId: record.patientId,
        prediction: record.prediction,
        patientData: record.patientData,
        status: record.status,
        createdAt: record.createdAt,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Get pending reviews error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch pending reviews',
    });
  }
};

/**
 * Submit Review
 * POST /api/v1/counselor/records/:recordId/review
 */
export const submitReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const counselor = req.user!;
    const { recordId } = req.params;
    const { status, notes, recommendations, overrideDiagnosis, agreesWithAI, modifiedDiagnosis, followUpDate } = req.body;

    // Get record
    const record = await HealthRecord.findById(recordId);
    if (!record) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Health record not found',
      });
      return;
    }

    // Verify access
    const patientProfile = await PatientProfile.findOne({
      userId: record.patientId,
      assignedCounselorId: counselor._id,
    });

    const isShared = record.sharedWith.some(
      (s) => s.userId.toString() === counselor._id.toString()
    );

    if (!patientProfile && !isShared) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Not authorized to review this record',
      });
      return;
    }

    // Determine if counselor agrees with AI based on status or agreesWithAI field
    const counselorAgreesWithAI = status === 'approved' || agreesWithAI === true || (status !== 'rejected' && !overrideDiagnosis);
    
    // Determine the modified diagnosis
    const finalModifiedDiagnosis = overrideDiagnosis || modifiedDiagnosis;

    // Add review
    record.counselorReview = {
      counselorId: counselor._id,
      reviewedAt: new Date(),
      notes: notes || '',
      agreesWithAI: counselorAgreesWithAI,
      modifiedDiagnosis: finalModifiedDiagnosis,
      recommendations: recommendations || [],
      followUpDate: followUpDate ? new Date(followUpDate) : undefined,
    };

    // Update status based on review status
    if (status === 'needs_more_info') {
      record.status = 'pending';
      record.statusHistory.push({
        status: 'pending',
        changedAt: new Date(),
        changedBy: counselor._id,
        reason: 'Counselor requested more information',
      });
    } else {
      record.status = 'reviewed';
      record.statusHistory.push({
        status: 'reviewed',
        changedAt: new Date(),
        changedBy: counselor._id,
        reason: status === 'rejected' ? 'Counselor overrode AI diagnosis' : 'Counselor review completed',
      });
    }

    await record.save();

    // Update counselor stats
    await CounselorProfile.findOneAndUpdate(
      { userId: counselor._id },
      { $inc: { 'stats.totalDiagnosesReviewed': 1 } }
    );

    // Log review
    await AuditLog.create({
      action: 'counselor.review',
      userId: counselor._id,
      targetId: record._id,
      targetType: 'HealthRecord',
      description: `Counselor reviewed health record ${record.recordNumber}`,
      requestContext: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
      },
      metadata: { status, agreesWithAI: counselorAgreesWithAI, modifiedDiagnosis: finalModifiedDiagnosis },
      success: true,
    });

    res.json({
      success: true,
      message: 'Review submitted successfully',
      record: {
        id: record._id,
        recordNumber: record.recordNumber,
        status: record.status,
        counselorReview: record.counselorReview,
      },
    });
  } catch (error: any) {
    console.error('Submit review error:', error);
    res.status(500).json({
      success: false,
      error: 'REVIEW_ERROR',
      message: 'Failed to submit review',
    });
  }
};

/**
 * Get Patient History
 * GET /api/v1/counselor/patients/:patientId/history
 */
export const getPatientHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const counselor = req.user!;
    const { patientId } = req.params;

    // Verify access
    const patientProfile = await PatientProfile.findOne({
      userId: patientId,
      assignedCounselorId: counselor._id,
    });

    if (!patientProfile) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Not authorized to view this patient',
      });
      return;
    }

    // Get patient info
    const patient = await User.findById(patientId).select(
      'firstName lastName email profilePicture createdAt'
    );

    // Get all records
    const records = await HealthRecord.find({
      patientId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .populate('counselorReview.counselorId', 'firstName lastName');

    // Build history summary
    const diagnoses = records
      .filter((r) => r.prediction?.diagnosis)
      .map((r) => ({
        diagnosis: r.prediction!.diagnosis,
        confidence: r.prediction!.confidence,
        date: r.createdAt,
        reviewed: !!r.counselorReview,
      }));

    res.json({
      success: true,
      patient: {
        ...patient?.toObject(),
        profile: {
          dateOfBirth: patientProfile.dateOfBirth,
          gender: patientProfile.gender,
          medicalHistory: patientProfile.medicalHistory,
        },
      },
      summary: {
        totalRecords: records.length,
        reviewedRecords: records.filter((r) => r.status === 'reviewed').length,
        diagnoses,
      },
      records: records.map((record) => ({
        id: record._id,
        recordNumber: record.recordNumber,
        status: record.status,
        prediction: record.prediction,
        counselorReview: record.counselorReview,
        createdAt: record.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Get patient history error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch patient history',
    });
  }
};

/**
 * Add Notes to Patient
 * POST /api/v1/counselor/patients/:patientId/notes
 */
export const addPatientNotes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const counselor = req.user!;
    const { patientId } = req.params;
    const { notes, recordId } = req.body;

    if (!notes) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Notes are required',
      });
      return;
    }

    // If recordId is provided, add notes to specific record
    if (recordId) {
      const record = await HealthRecord.findById(recordId);
      if (!record) {
        res.status(404).json({
          success: false,
          error: 'NOT_FOUND',
          message: 'Health record not found',
        });
        return;
      }

      if (record.counselorReview) {
        record.counselorReview.notes = notes;
      } else {
        record.counselorReview = {
          counselorId: counselor._id,
          reviewedAt: new Date(),
          notes,
          agreesWithAI: true,
          recommendations: [],
        };
      }

      await record.save();

      res.json({
        success: true,
        message: 'Notes added successfully',
        record: {
          id: record._id,
          recordNumber: record.recordNumber,
          counselorReview: record.counselorReview,
        },
      });
    } else {
      // Add general notes to patient profile
      res.json({
        success: true,
        message: 'Notes functionality for general patient notes is pending',
      });
    }
  } catch (error: any) {
    console.error('Add patient notes error:', error);
    res.status(500).json({
      success: false,
      error: 'NOTES_ERROR',
      message: 'Failed to add notes',
    });
  }
};

/**
 * Get Counselor Analytics
 * GET /api/v1/counselor/analytics
 */
export const getAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const counselor = req.user!;
    const { startDate, endDate } = req.query;

    // Get counselor profile
    const profile = await CounselorProfile.findOne({ userId: counselor._id });

    // Get assigned patients
    const assignedPatients = await PatientProfile.countDocuments({
      assignedCounselorId: counselor._id,
    });

    // Get record stats
    const patientProfiles = await PatientProfile.find({
      assignedCounselorId: counselor._id,
    }).select('userId');

    const patientIds = patientProfiles.map((p) => p.userId);

    const dateQuery: Record<string, any> = {};
    if (startDate || endDate) {
      dateQuery.createdAt = {};
      if (startDate) dateQuery.createdAt.$gte = new Date(startDate as string);
      if (endDate) dateQuery.createdAt.$lte = new Date(endDate as string);
    }

    const [totalRecords, reviewedRecords, pendingRecords] = await Promise.all([
      HealthRecord.countDocuments({
        patientId: { $in: patientIds },
        isDeleted: false,
        ...dateQuery,
      }),
      HealthRecord.countDocuments({
        patientId: { $in: patientIds },
        status: 'reviewed',
        'counselorReview.counselorId': counselor._id,
        isDeleted: false,
        ...dateQuery,
      }),
      HealthRecord.countDocuments({
        patientId: { $in: patientIds },
        status: 'completed',
        'counselorReview.counselorId': { $exists: false },
        isDeleted: false,
        ...dateQuery,
      }),
    ]);

    // Get diagnosis distribution
    const diagnosisStats = await HealthRecord.aggregate([
      {
        $match: {
          patientId: { $in: patientIds },
          'prediction.diagnosis': { $exists: true },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$prediction.diagnosis',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      analytics: {
        profile: {
          totalPatientsServed: profile?.stats.totalPatientsServed || 0,
          totalDiagnosesReviewed: profile?.stats.totalDiagnosesReviewed || 0,
          averageRating: profile?.stats.averageRating || 0,
        },
        current: {
          assignedPatients,
          totalRecords,
          reviewedRecords,
          pendingRecords,
        },
        diagnosisDistribution: diagnosisStats.map((d) => ({
          diagnosis: d._id,
          count: d.count,
        })),
      },
    });
  } catch (error: any) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'ANALYTICS_ERROR',
      message: 'Failed to fetch analytics',
    });
  }
};

/**
 * Get Counselor Dashboard Stats
 * GET /api/v1/counselor/dashboard
 */
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const counselor = req.user!;

    // Get counselor profile
    const profile = await CounselorProfile.findOne({ userId: counselor._id });

    // Get assigned patients
    const patientProfiles = await PatientProfile.find({
      assignedCounselorId: counselor._id,
    }).select('userId');

    const patientIds = patientProfiles.map((p) => p.userId);
    const assignedPatients = patientProfiles.length;

    // Get record counts
    const [totalRecords, pendingReviews, reviewedThisMonth, highRiskCases] = await Promise.all([
      HealthRecord.countDocuments({
        patientId: { $in: patientIds },
        isDeleted: false,
      }),
      HealthRecord.countDocuments({
        patientId: { $in: patientIds },
        status: 'completed',
        'counselorReview.counselorId': { $exists: false },
        isDeleted: false,
      }),
      HealthRecord.countDocuments({
        patientId: { $in: patientIds },
        status: 'reviewed',
        'counselorReview.counselorId': counselor._id,
        'counselorReview.reviewedAt': { $gte: new Date(new Date().setDate(1)) },
        isDeleted: false,
      }),
      HealthRecord.countDocuments({
        patientId: { $in: patientIds },
        'prediction.riskLevel': 'high',
        isDeleted: false,
      }),
    ]);

    // Get recent activity
    const recentRecords = await HealthRecord.find({
      patientId: { $in: patientIds },
      isDeleted: false,
    })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('patientId', 'firstName lastName');

    res.json({
      success: true,
      stats: {
        assignedPatients,
        totalRecords,
        pendingReviews,
        reviewedThisMonth,
        highRiskCases,
        profile: {
          totalPatientsServed: profile?.stats.totalPatientsServed || 0,
          totalDiagnosesReviewed: profile?.stats.totalDiagnosesReviewed || 0,
          averageRating: profile?.stats.averageRating || 0,
        },
        recentActivity: recentRecords.map((record) => ({
          id: record._id,
          recordNumber: record.recordNumber,
          patient: record.patientId,
          status: record.status,
          prediction: record.prediction,
          updatedAt: record.updatedAt,
        })),
      },
    });
  } catch (error: any) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch dashboard statistics',
    });
  }
};

export default {
  getAssignedPatients,
  getPatientRecords,
  getRecordById,
  getPendingReviews,
  submitReview,
  getPatientHistory,
  addPatientNotes,
  getAnalytics,
  getDashboardStats,
};
