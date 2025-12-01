import { Router, IRouter } from 'express';
import researcherController from '../controllers/researcher.controller';
import assessmentController from '../controllers/assessment.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router: IRouter = Router();

// All routes require authentication and researcher role
router.use(authenticate);
router.use(authorize('researcher', 'admin'));

/**
 * @route   GET /api/v1/researcher/dashboard
 * @desc    Get researcher dashboard statistics
 * @access  Private (Researcher)
 */
router.get('/dashboard', researcherController.getDashboardStats);

/**
 * @route   GET /api/v1/researcher/datasets
 * @desc    Get available datasets
 * @access  Private (Researcher)
 */
router.get('/datasets', researcherController.getDatasets);

/**
 * @route   GET /api/v1/researcher/datasets/:type
 * @desc    Get dataset details by type
 * @access  Private (Researcher)
 */
router.get('/datasets/:type', researcherController.getDatasetDetails);

/**
 * @route   POST /api/v1/researcher/analysis
 * @desc    Run analysis on dataset
 * @access  Private (Researcher)
 */
router.post('/analysis', researcherController.runAnalysis);

/**
 * @route   GET /api/v1/researcher/analyses
 * @desc    Get analysis history
 * @access  Private (Researcher)
 */
router.get('/analyses', researcherController.getAnalyses);

/**
 * @route   GET /api/v1/researcher/analytics
 * @desc    Get research analytics
 * @access  Private (Researcher)
 */
router.get('/analytics', researcherController.getAnalytics);

/**
 * @route   POST /api/v1/researcher/export
 * @desc    Export dataset
 * @access  Private (Researcher)
 */
router.post('/export', researcherController.exportDataset);

// ============================================
// Assessment Routes (New Health Assessment)
// ============================================

/**
 * @route   GET /api/v1/researcher/patients/available
 * @desc    Get available patients for assessment creation
 * @access  Private (Researcher)
 */
router.get('/patients/available', assessmentController.getAvailablePatients);

/**
 * @route   GET /api/v1/researcher/assessments
 * @desc    Get all assessments created by researcher
 * @access  Private (Researcher)
 */
router.get('/assessments', assessmentController.getAssessments);

/**
 * @route   POST /api/v1/researcher/assessments
 * @desc    Create new health assessment for a patient
 * @access  Private (Researcher)
 */
router.post('/assessments', assessmentController.createAssessment);

/**
 * @route   GET /api/v1/researcher/assessments/:id
 * @desc    Get single assessment
 * @access  Private (Researcher)
 */
router.get('/assessments/:id', assessmentController.getAssessment);

/**
 * @route   POST /api/v1/researcher/assessments/:id/predict
 * @desc    Request prediction for assessment
 * @access  Private (Researcher)
 */
router.post('/assessments/:id/predict', assessmentController.requestAssessmentPrediction);

/**
 * @route   GET /api/v1/researcher/ml-status
 * @desc    Check ML service status
 * @access  Private (Researcher)
 */
router.get('/ml-status', assessmentController.getMLStatus);

export default router;
