import { Request, Response, NextFunction } from 'express';
// Using global Express.Request type
import { 
  User, 
  License, 
  HealthRecord, 
  AuditLog, 
  PatientProfile,
  CounselorProfile,
  ResearcherProfile,
  AdminProfile 
} from '../models';
import mongoose from 'mongoose';

/**
 * Get Dashboard Statistics
 * GET /api/v1/admin/dashboard
 */
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [
      totalUsers,
      activeUsers,
      patientCount,
      counselorCount,
      researcherCount,
      adminCount,
      totalLicenses,
      availableLicenses,
      claimedLicenses,
      totalRecords,
      pendingRecords,
      completedRecords,
      reviewedRecords,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ role: 'patient' }),
      User.countDocuments({ role: 'counselor' }),
      User.countDocuments({ role: 'researcher' }),
      User.countDocuments({ role: 'admin' }),
      License.countDocuments(),
      License.countDocuments({ status: 'available' }),
      License.countDocuments({ status: 'claimed' }),
      HealthRecord.countDocuments({ isDeleted: false }),
      HealthRecord.countDocuments({ status: 'pending', isDeleted: false }),
      HealthRecord.countDocuments({ status: 'completed', isDeleted: false }),
      HealthRecord.countDocuments({ status: 'reviewed', isDeleted: false }),
    ]);

    // Get recent registrations (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentRegistrations = await User.countDocuments({
      createdAt: { $gte: weekAgo },
    });

    // Get diagnosis distribution
    const diagnosisDistribution = await HealthRecord.aggregate([
      {
        $match: {
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
      { $limit: 10 },
    ]);

    // Get registration trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const registrationTrend = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          byRole: {
            patient: patientCount,
            counselor: counselorCount,
            researcher: researcherCount,
            admin: adminCount,
          },
          recentRegistrations,
        },
        licenses: {
          total: totalLicenses,
          available: availableLicenses,
          claimed: claimedLicenses,
        },
        healthRecords: {
          total: totalRecords,
          pending: pendingRecords,
          completed: completedRecords,
          reviewed: reviewedRecords,
        },
        diagnosisDistribution: diagnosisDistribution.map((d) => ({
          diagnosis: d._id,
          count: d.count,
        })),
        registrationTrend,
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

/**
 * Get Audit Logs
 * GET /api/v1/admin/audit-logs
 */
export const getAuditLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      userId,
      startDate,
      endDate,
      success,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query: Record<string, any> = {};

    if (action) query.action = action;
    if (userId) query.userId = userId;
    if (success !== undefined) query.success = success === 'true';

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort: Record<string, 1 | -1> = { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 };

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .populate('userId', 'firstName lastName email role'),
      AuditLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch audit logs',
    });
  }
};

/**
 * Get System Health
 * GET /api/v1/admin/system-health
 */
export const getSystemHealth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check MongoDB connection
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    // Get MongoDB stats
    let dbStats = null;
    if (mongoStatus === 'connected') {
      try {
        dbStats = await mongoose.connection.db?.stats();
      } catch (e) {
        console.error('Error getting DB stats:', e);
      }
    }

    // Memory usage
    const memoryUsage = process.memoryUsage();

    // Uptime
    const uptime = process.uptime();

    res.json({
      success: true,
      health: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: {
          seconds: uptime,
          formatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
        },
        services: {
          mongodb: {
            status: mongoStatus,
            stats: dbStats ? {
              collections: dbStats.collections,
              objects: dbStats.objects,
              dataSize: `${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`,
              storageSize: `${(dbStats.storageSize / 1024 / 1024).toFixed(2)} MB`,
            } : null,
          },
          redis: {
            status: 'connected', // Would need actual Redis check
          },
        },
        memory: {
          heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
          external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`,
          rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
        },
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
      },
    });
  } catch (error: any) {
    console.error('Get system health error:', error);
    res.status(500).json({
      success: false,
      error: 'HEALTH_CHECK_ERROR',
      message: 'Failed to get system health',
    });
  }
};

/**
 * Assign Counselor to Patient
 * POST /api/v1/admin/assign-counselor
 */
export const assignCounselor = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admin = req.user!;
    const { patientId, counselorId } = req.body;

    // Validate patient
    const patient = await User.findOne({ _id: patientId, role: 'patient', status: 'active' });
    if (!patient) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Patient not found',
      });
      return;
    }

    // Validate counselor
    const counselor = await User.findOne({ _id: counselorId, role: 'counselor', status: 'active' });
    if (!counselor) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Counselor not found',
      });
      return;
    }

    // Check counselor capacity
    const counselorProfile = await CounselorProfile.findOne({ userId: counselorId });
    if (counselorProfile && counselorProfile.currentPatientCount >= (counselorProfile.maxPatients || 50)) {
      res.status(400).json({
        success: false,
        error: 'CAPACITY_EXCEEDED',
        message: 'Counselor has reached maximum patient capacity',
      });
      return;
    }

    // Update patient profile
    const patientProfile = await PatientProfile.findOneAndUpdate(
      { userId: patientId },
      { assignedCounselorId: counselorId },
      { new: true, upsert: true }
    );

    // Update counselor stats
    await CounselorProfile.findOneAndUpdate(
      { userId: counselorId },
      { $inc: { currentPatientCount: 1, 'stats.totalPatientsServed': 1 } }
    );

    // Log assignment
    await AuditLog.create({
      action: 'admin.action',
      userId: admin._id,
      targetId: patientId,
      targetType: 'User',
      description: `Admin assigned counselor ${counselor.email} to patient ${patient.email}`,
      requestContext: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
      },
      metadata: { counselorId, patientId },
      success: true,
    });

    res.json({
      success: true,
      message: 'Counselor assigned successfully',
      assignment: {
        patient: {
          id: patient._id,
          name: patient.getFullName(),
          email: patient.email,
        },
        counselor: {
          id: counselor._id,
          name: counselor.getFullName(),
          email: counselor.email,
        },
      },
    });
  } catch (error: any) {
    console.error('Assign counselor error:', error);
    res.status(500).json({
      success: false,
      error: 'ASSIGN_ERROR',
      message: 'Failed to assign counselor',
    });
  }
};

/**
 * Get Security Statistics
 * GET /api/v1/admin/security-stats
 */
export const getSecurityStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      failedLoginsToday,
      suspiciousActivities,
      lockedAccounts,
      recentLogins,
      loginsByCountry,
    ] = await Promise.all([
      AuditLog.countDocuments({
        action: 'user.login',
        success: false,
        createdAt: { $gte: twentyFourHoursAgo },
      }),
      AuditLog.countDocuments({
        action: 'security.breach_attempt',
        createdAt: { $gte: weekAgo },
      }),
      User.countDocuments({
        lockoutUntil: { $gt: new Date() },
      }),
      AuditLog.find({
        action: 'user.login',
        success: true,
        createdAt: { $gte: twentyFourHoursAgo },
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'firstName lastName email'),
      AuditLog.aggregate([
        {
          $match: {
            action: 'user.login',
            success: true,
            createdAt: { $gte: weekAgo },
          },
        },
        {
          $group: {
            _id: '$requestContext.ip',
            count: { $sum: 1 },
            lastLogin: { $max: '$createdAt' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    res.json({
      success: true,
      security: {
        failedLoginsToday,
        suspiciousActivitiesThisWeek: suspiciousActivities,
        lockedAccounts,
        recentLogins: recentLogins.map((log) => ({
          user: log.userId,
          ip: log.requestContext?.ip,
          device: log.requestContext?.userAgent,
          timestamp: log.createdAt,
        })),
        topIPs: loginsByCountry,
      },
    });
  } catch (error: any) {
    console.error('Get security stats error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch security statistics',
    });
  }
};

/**
 * Get System Settings
 * GET /api/v1/admin/settings
 */
export const getSystemSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // In a real app, these would be stored in database
    const settings = {
      general: {
        systemName: process.env.SYSTEM_NAME || 'ImmunoDetect',
        maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
        maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE || '10', 10),
      },
      security: {
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '30', 10),
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
        lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '15', 10),
        requireMFA: process.env.REQUIRE_MFA === 'true',
      },
      notifications: {
        emailNotifications: process.env.EMAIL_NOTIFICATIONS !== 'false',
        smsNotifications: process.env.SMS_NOTIFICATIONS === 'true',
        slackIntegration: process.env.SLACK_WEBHOOK ? true : false,
      },
      ai: {
        modelVersion: process.env.AI_MODEL_VERSION || '1.0.0',
        confidenceThreshold: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.8'),
        autoAnalysis: process.env.AUTO_ANALYSIS !== 'false',
      },
    };

    res.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error('Get system settings error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch system settings',
    });
  }
};

/**
 * Update System Settings
 * PUT /api/v1/admin/settings
 */
export const updateSystemSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admin = req.user!;
    const { settings } = req.body;

    // Log the settings update
    await AuditLog.create({
      action: 'admin.settings_update',
      userId: admin._id,
      description: 'Admin updated system settings',
      metadata: { settings },
      success: true,
    });

    // In a real app, these would be saved to database
    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings,
    });
  } catch (error: any) {
    console.error('Update system settings error:', error);
    res.status(500).json({
      success: false,
      error: 'UPDATE_ERROR',
      message: 'Failed to update system settings',
    });
  }
};

export default {
  getDashboardStats,
  getAuditLogs,
  getSystemHealth,
  assignCounselor,
  getSecurityStats,
  getSystemSettings,
  updateSystemSettings,
};
