import { Request, Response, NextFunction } from 'express';
import { HealthRecord, User, ResearcherProfile, AuditLog } from '../models';
import mongoose from 'mongoose';

/**
 * Get Researcher Dashboard Stats
 * GET /api/v1/researcher/dashboard
 */
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const researcher = req.user!;

    // Get researcher profile
    const profile = await ResearcherProfile.findOne({ userId: researcher._id });

    // Get total anonymized records available for research
    const totalRecords = await HealthRecord.countDocuments({
      status: 'reviewed',
      'counselorReview.status': 'approved',
      isDeleted: false,
    });

    // Get records accessed by this researcher (from audit logs)
    const accessLogs = await AuditLog.countDocuments({
      userId: researcher._id,
      action: { $in: ['researcher.access_record', 'researcher.access_dataset'] },
    });

    // Get analyses run by this researcher
    const analysisLogs = await AuditLog.countDocuments({
      userId: researcher._id,
      action: 'researcher.run_analysis',
    });

    // Get recent activity
    const recentActivity = await AuditLog.find({
      userId: researcher._id,
      action: { $regex: /^researcher\./ },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('action description createdAt metadata');

    // Create dataset summaries based on diagnosis types
    const diagnosisCounts = await HealthRecord.aggregate([
      {
        $match: {
          status: 'reviewed',
          'counselorReview.status': 'approved',
          isDeleted: false,
          'prediction.diagnosis': { $exists: true },
        },
      },
      {
        $group: {
          _id: '$prediction.diagnosis',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const recentDatasets = diagnosisCounts.map((d, i) => ({
      id: `dataset-${i + 1}`,
      name: `${d._id || 'Unclassified'} Cases`,
      recordCount: d.count,
      lastAccessed: new Date().toISOString(),
      type: d._id || 'mixed',
    }));

    // Recent analyses (from audit logs)
    const recentAnalysisLogs = await AuditLog.find({
      userId: researcher._id,
      action: 'researcher.run_analysis',
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('description metadata createdAt');

    const recentAnalyses = recentAnalysisLogs.map((log, i) => ({
      id: log._id.toString(),
      name: log.metadata?.analysisName || `Analysis ${i + 1}`,
      status: log.metadata?.status || 'completed',
      createdAt: log.createdAt,
      type: log.metadata?.type || 'statistical',
    }));

    res.json({
      success: true,
      stats: {
        datasetsAccessed: accessLogs,
        analysesRun: analysisLogs,
        activeProjects: profile?.stats?.totalProjectsCreated || 0,
        publicationsCount: profile?.stats?.totalPublications || 0,
        totalAvailableRecords: totalRecords,
        recentDatasets: recentDatasets.length > 0 ? recentDatasets : [
          { id: 'dataset-1', name: 'SCID Cases', recordCount: totalRecords, lastAccessed: new Date().toISOString(), type: 'scid' },
        ],
        recentAnalyses,
        recentActivity: recentActivity.map(a => ({
          id: a._id,
          type: a.action,
          description: a.description,
          timestamp: a.createdAt,
        })),
        profile: {
          researchFocus: profile?.researchFocus || [],
          dataAccessLevel: profile?.dataAccessLevel || 'basic',
          institution: profile?.institution || '',
        },
      },
    });
  } catch (error: any) {
    console.error('Researcher dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch dashboard stats',
    });
  }
};

/**
 * Get Available Datasets
 * GET /api/v1/researcher/datasets
 */
export const getDatasets = async (req: Request, res: Response): Promise<void> => {
  try {
    const researcher = req.user!;
    const { page = 1, limit = 10, type, search } = req.query;

    // Get researcher's data access level
    const profile = await ResearcherProfile.findOne({ userId: researcher._id });
    const accessLevel = profile?.dataAccessLevel || 'basic';

    // Aggregate records by diagnosis type to create "datasets"
    const matchStage: any = {
      status: 'reviewed',
      'counselorReview.status': 'approved',
      isDeleted: false,
    };

    if (type && type !== 'all') {
      matchStage['prediction.diagnosis'] = { $regex: type, $options: 'i' };
    }

    const datasets = await HealthRecord.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$prediction.diagnosis',
          recordCount: { $sum: 1 },
          avgConfidence: { $avg: '$prediction.confidence' },
          latestRecord: { $max: '$createdAt' },
          riskLevels: { $push: '$prediction.riskLevel' },
        },
      },
      { $sort: { recordCount: -1 } },
    ]);

    // Format datasets
    const formattedDatasets = datasets.map((d, i) => {
      const highRisk = d.riskLevels.filter((r: string) => r === 'high').length;
      const moderateRisk = d.riskLevels.filter((r: string) => r === 'moderate').length;
      
      return {
        id: `dataset-${d._id || 'unknown'}-${i}`,
        name: `${d._id || 'Unclassified'} Dataset`,
        description: `Anonymized health records for ${d._id || 'unclassified'} cases`,
        recordCount: d.recordCount,
        avgConfidence: d.avgConfidence ? (d.avgConfidence * 100).toFixed(1) : 0,
        lastUpdated: d.latestRecord,
        type: d._id || 'mixed',
        riskDistribution: {
          high: highRisk,
          moderate: moderateRisk,
          low: d.recordCount - highRisk - moderateRisk,
        },
        accessLevel: 'basic', // All approved records are accessible
        available: true,
      };
    });

    // Filter by search if provided
    let filteredDatasets = formattedDatasets;
    if (search) {
      const searchLower = (search as string).toLowerCase();
      filteredDatasets = formattedDatasets.filter(d => 
        d.name.toLowerCase().includes(searchLower) ||
        d.description.toLowerCase().includes(searchLower)
      );
    }

    // Paginate
    const skip = (Number(page) - 1) * Number(limit);
    const paginatedDatasets = filteredDatasets.slice(skip, skip + Number(limit));

    // Log access
    await AuditLog.create({
      action: 'researcher.view_datasets',
      userId: researcher._id,
      description: `Researcher viewed available datasets`,
      success: true,
    });

    res.json({
      success: true,
      datasets: paginatedDatasets,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: filteredDatasets.length,
        pages: Math.ceil(filteredDatasets.length / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Get datasets error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch datasets',
    });
  }
};

/**
 * Get Dataset Details
 * GET /api/v1/researcher/datasets/:type
 */
export const getDatasetDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const researcher = req.user!;
    const { type } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Get anonymized records for this diagnosis type
    const query: any = {
      status: 'reviewed',
      'counselorReview.status': 'approved',
      isDeleted: false,
    };

    if (type !== 'all') {
      query['prediction.diagnosis'] = { $regex: type, $options: 'i' };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [records, total] = await Promise.all([
      HealthRecord.find(query)
        .select('recordNumber prediction patientData createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      HealthRecord.countDocuments(query),
    ]);

    // Anonymize records - remove patient identifiers
    const anonymizedRecords = records.map((record, i) => ({
      id: record._id,
      anonymousId: `RECORD-${String(i + 1 + skip).padStart(4, '0')}`,
      prediction: record.prediction,
      labMarkers: record.patientData ? {
        alcLevel: record.patientData.labALCLevel,
        igGLevel: record.patientData.labIgGLevel,
        hasAbnormalities: (record.patientData.labALCLevel || 0) < 1000 || (record.patientData.labIgGLevel || 0) < 200,
      } : null,
      ageYears: record.patientData?.ageYears || 0,
      createdAt: record.createdAt,
    }));

    // Log access
    await AuditLog.create({
      action: 'researcher.access_dataset',
      userId: researcher._id,
      description: `Researcher accessed ${type} dataset`,
      metadata: { datasetType: type, recordsViewed: records.length },
      success: true,
    });

    res.json({
      success: true,
      dataset: {
        type,
        name: `${type} Dataset`,
        totalRecords: total,
        records: anonymizedRecords,
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Get dataset details error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch dataset details',
    });
  }
};

/**
 * Run Analysis on Dataset
 * POST /api/v1/researcher/analysis
 */
export const runAnalysis = async (req: Request, res: Response): Promise<void> => {
  try {
    const researcher = req.user!;
    const { datasetType, analysisType, name, parameters } = req.body;

    if (!datasetType || !analysisType) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Dataset type and analysis type are required',
      });
      return;
    }

    // Get records for analysis
    const query: any = {
      status: 'reviewed',
      'counselorReview.status': 'approved',
      isDeleted: false,
    };

    if (datasetType !== 'all') {
      query['prediction.diagnosis'] = { $regex: datasetType, $options: 'i' };
    }

    const records = await HealthRecord.find(query)
      .select('prediction geneData symptoms');

    // Perform basic statistical analysis
    const analysis: any = {
      id: new mongoose.Types.ObjectId().toString(),
      name: name || `${analysisType} Analysis`,
      type: analysisType,
      datasetType,
      status: 'completed',
      createdAt: new Date(),
      recordsAnalyzed: records.length,
      results: {},
    };

    switch (analysisType) {
      case 'distribution':
        // Diagnosis distribution
        const diagnosisDist: Record<string, number> = {};
        const riskDist: Record<string, number> = { high: 0, moderate: 0, low: 0 };
        let totalConfidence = 0;
        let confidenceCount = 0;

        records.forEach(r => {
          if (r.prediction?.diagnosis) {
            diagnosisDist[r.prediction.diagnosis] = (diagnosisDist[r.prediction.diagnosis] || 0) + 1;
          }
          if (r.prediction?.riskLevel) {
            riskDist[r.prediction.riskLevel] = (riskDist[r.prediction.riskLevel] || 0) + 1;
          }
          if (r.prediction?.confidence) {
            totalConfidence += r.prediction.confidence;
            confidenceCount++;
          }
        });

        analysis.results = {
          diagnosisDistribution: diagnosisDist,
          riskDistribution: riskDist,
          averageConfidence: confidenceCount > 0 ? (totalConfidence / confidenceCount * 100).toFixed(1) : 0,
          totalRecords: records.length,
        };
        break;

      case 'correlation':
        // Lab marker correlations
        const labStats = {
          avgAlcLevel: 0,
          avgIgGLevel: 0,
          abnormalCount: 0,
          recordsWithLabData: 0,
        };

        records.forEach(r => {
          if (r.patientData) {
            labStats.recordsWithLabData++;
            labStats.avgAlcLevel += r.patientData.labALCLevel || 0;
            labStats.avgIgGLevel += r.patientData.labIgGLevel || 0;
            if ((r.patientData.labALCLevel || 0) < 1000 || (r.patientData.labIgGLevel || 0) < 200) {
              labStats.abnormalCount++;
            }
          }
        });

        if (labStats.recordsWithLabData > 0) {
          labStats.avgAlcLevel /= labStats.recordsWithLabData;
          labStats.avgIgGLevel /= labStats.recordsWithLabData;
        }

        analysis.results = {
          labMarkerStats: labStats,
          totalRecords: records.length,
          recordsWithLabData: labStats.recordsWithLabData,
          abnormalPercentage: labStats.recordsWithLabData > 0 ? (labStats.abnormalCount / labStats.recordsWithLabData * 100).toFixed(1) : 0,
        };
        break;

      case 'trend':
        // Time-based trends
        const monthlyData: Record<string, number> = {};
        records.forEach(r => {
          const month = new Date(r.createdAt).toISOString().slice(0, 7);
          monthlyData[month] = (monthlyData[month] || 0) + 1;
        });

        analysis.results = {
          monthlyTrends: Object.entries(monthlyData)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, count]) => ({ month, count })),
          totalRecords: records.length,
        };
        break;

      default:
        // Summary statistics
        analysis.results = {
          totalRecords: records.length,
          summary: 'Basic analysis completed',
        };
    }

    // Log the analysis
    await AuditLog.create({
      action: 'researcher.run_analysis',
      userId: researcher._id,
      description: `Ran ${analysisType} analysis on ${datasetType} dataset`,
      metadata: {
        analysisId: analysis.id,
        analysisName: analysis.name,
        type: analysisType,
        recordsAnalyzed: records.length,
        status: 'completed',
      },
      success: true,
    });

    // Update researcher profile stats
    await ResearcherProfile.findOneAndUpdate(
      { userId: researcher._id },
      { $inc: { 'stats.analysesRun': 1 } }
    );

    res.json({
      success: true,
      analysis,
    });
  } catch (error: any) {
    console.error('Run analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'ANALYSIS_ERROR',
      message: 'Failed to run analysis',
    });
  }
};

/**
 * Get Analyses History
 * GET /api/v1/researcher/analyses
 */
export const getAnalyses = async (req: Request, res: Response): Promise<void> => {
  try {
    const researcher = req.user!;
    const { page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find({
        userId: researcher._id,
        action: 'researcher.run_analysis',
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('metadata createdAt'),
      AuditLog.countDocuments({
        userId: researcher._id,
        action: 'researcher.run_analysis',
      }),
    ]);

    const analyses = logs.map(log => ({
      id: log.metadata?.analysisId || log._id,
      name: log.metadata?.analysisName || 'Unnamed Analysis',
      type: log.metadata?.type || 'unknown',
      status: log.metadata?.status || 'completed',
      recordsAnalyzed: log.metadata?.recordsAnalyzed || 0,
      createdAt: log.createdAt,
    }));

    res.json({
      success: true,
      analyses,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Get analyses error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch analyses',
    });
  }
};

/**
 * Get Research Analytics
 * GET /api/v1/researcher/analytics
 */
export const getAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const researcher = req.user!;

    // Overall statistics
    const totalApprovedRecords = await HealthRecord.countDocuments({
      status: 'reviewed',
      'counselorReview.status': 'approved',
      isDeleted: false,
    });

    // Diagnosis breakdown
    const diagnosisBreakdown = await HealthRecord.aggregate([
      {
        $match: {
          status: 'reviewed',
          'counselorReview.status': 'approved',
          isDeleted: false,
          'prediction.diagnosis': { $exists: true },
        },
      },
      {
        $group: {
          _id: '$prediction.diagnosis',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$prediction.confidence' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Monthly trends
    const monthlyTrends = await HealthRecord.aggregate([
      {
        $match: {
          status: 'reviewed',
          'counselorReview.status': 'approved',
          isDeleted: false,
          createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Risk level distribution
    const riskDistribution = await HealthRecord.aggregate([
      {
        $match: {
          status: 'reviewed',
          'counselorReview.status': 'approved',
          isDeleted: false,
          'prediction.riskLevel': { $exists: true },
        },
      },
      {
        $group: {
          _id: '$prediction.riskLevel',
          count: { $sum: 1 },
        },
      },
    ]);

    // Researcher's activity
    const myActivity = await AuditLog.aggregate([
      {
        $match: {
          userId: researcher._id,
          action: { $regex: /^researcher\./ },
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          actions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      analytics: {
        overview: {
          totalRecords: totalApprovedRecords,
          diagnosisTypes: diagnosisBreakdown.length,
          averageConfidence: diagnosisBreakdown.reduce((sum, d) => sum + (d.avgConfidence || 0), 0) / diagnosisBreakdown.length * 100 || 0,
        },
        diagnosisBreakdown: diagnosisBreakdown.map(d => ({
          diagnosis: d._id,
          count: d.count,
          avgConfidence: (d.avgConfidence * 100).toFixed(1),
        })),
        monthlyTrends: monthlyTrends.map(t => ({
          month: t._id,
          count: t.count,
        })),
        riskDistribution: Object.fromEntries(
          riskDistribution.map(r => [r._id, r.count])
        ),
        myActivity: myActivity.map(a => ({
          date: a._id,
          actions: a.actions,
        })),
      },
    });
  } catch (error: any) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch analytics',
    });
  }
};

/**
 * Export Dataset
 * POST /api/v1/researcher/export
 */
export const exportDataset = async (req: Request, res: Response): Promise<void> => {
  try {
    const researcher = req.user!;
    const { datasetType, format = 'json' } = req.body;

    // Get records
    const query: any = {
      status: 'reviewed',
      'counselorReview.status': 'approved',
      isDeleted: false,
    };

    if (datasetType && datasetType !== 'all') {
      query['prediction.diagnosis'] = { $regex: datasetType, $options: 'i' };
    }

    const records = await HealthRecord.find(query)
      .select('recordNumber prediction patientData createdAt')
      .limit(1000); // Limit export size

    // Anonymize data
    const exportData = records.map((record, i) => ({
      anonymousId: `RECORD-${String(i + 1).padStart(4, '0')}`,
      diagnosis: record.prediction?.diagnosis,
      confidence: record.prediction?.confidence,
      riskLevel: record.prediction?.riskLevel,
      alcLevel: record.patientData?.labALCLevel,
      igGLevel: record.patientData?.labIgGLevel,
      ageYears: record.patientData?.ageYears,
      gender: record.patientData?.gender,
      recordDate: record.createdAt,
    }));

    // Log export
    await AuditLog.create({
      action: 'researcher.export_data',
      userId: researcher._id,
      description: `Exported ${exportData.length} records from ${datasetType || 'all'} dataset`,
      metadata: { datasetType, format, recordCount: exportData.length },
      success: true,
    });

    if (format === 'csv') {
      // Convert to CSV
      const headers = Object.keys(exportData[0] || {}).join(',');
      const rows = exportData.map(row => Object.values(row).join(','));
      const csv = [headers, ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=dataset-${datasetType || 'all'}-${Date.now()}.csv`);
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: exportData,
        metadata: {
          totalRecords: exportData.length,
          exportedAt: new Date(),
          datasetType: datasetType || 'all',
        },
      });
    }
  } catch (error: any) {
    console.error('Export dataset error:', error);
    res.status(500).json({
      success: false,
      error: 'EXPORT_ERROR',
      message: 'Failed to export dataset',
    });
  }
};

export default {
  getDashboardStats,
  getDatasets,
  getDatasetDetails,
  runAnalysis,
  getAnalyses,
  getAnalytics,
  exportDataset,
};
