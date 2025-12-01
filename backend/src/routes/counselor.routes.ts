import { Router, IRouter } from 'express';
import counselorController from '../controllers/counselor.controller';
import assessmentController from '../controllers/assessment.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router: IRouter = Router();

/**
 * @route   GET /api/v1/counselor/dashboard
 * @desc    Get counselor dashboard statistics
 * @access  Private/Counselor
 */
router.get(
  '/dashboard',
  authenticate,
  authorize('counselor'),
  counselorController.getDashboardStats
);

/**
 * @route   GET /api/v1/counselor/patients
 * @desc    Get all assigned patients
 * @access  Private/Counselor
 */
router.get(
  '/patients',
  authenticate,
  authorize('counselor'),
  counselorController.getAssignedPatients
);

/**
 * @route   GET /api/v1/counselor/patients/available
 * @desc    Get available patients for assessment creation
 * @access  Private/Counselor
 */
router.get(
  '/patients/available',
  authenticate,
  authorize('counselor'),
  assessmentController.getAvailablePatients
);

/**
 * @route   GET /api/v1/counselor/patients/:patientId/records
 * @desc    Get patient's health records
 * @access  Private/Counselor
 */
router.get(
  '/patients/:patientId/records',
  authenticate,
  authorize('counselor'),
  counselorController.getPatientRecords
);

/**
 * @route   GET /api/v1/counselor/patients/:patientId/history
 * @desc    Get patient's complete history
 * @access  Private/Counselor
 */
router.get(
  '/patients/:patientId/history',
  authenticate,
  authorize('counselor'),
  counselorController.getPatientHistory
);

/**
 * @route   POST /api/v1/counselor/patients/:patientId/notes
 * @desc    Add notes to patient
 * @access  Private/Counselor
 */
router.post(
  '/patients/:patientId/notes',
  authenticate,
  authorize('counselor'),
  counselorController.addPatientNotes
);

/**
 * @route   GET /api/v1/counselor/reviews/pending
 * @desc    Get pending reviews
 * @access  Private/Counselor
 */
router.get(
  '/reviews/pending',
  authenticate,
  authorize('counselor'),
  counselorController.getPendingReviews
);

/**
 * @route   GET /api/v1/counselor/records/:recordId
 * @desc    Get a specific health record by ID
 * @access  Private/Counselor
 */
router.get(
  '/records/:recordId',
  authenticate,
  authorize('counselor'),
  counselorController.getRecordById
);

/**
 * @route   POST /api/v1/counselor/records/:recordId/review
 * @desc    Submit review for a health record
 * @access  Private/Counselor
 */
router.post(
  '/records/:recordId/review',
  authenticate,
  authorize('counselor'),
  counselorController.submitReview
);

/**
 * @route   GET /api/v1/counselor/analytics
 * @desc    Get counselor analytics
 * @access  Private/Counselor
 */
router.get(
  '/analytics',
  authenticate,
  authorize('counselor'),
  counselorController.getAnalytics
);

// ============================================
// Assessment Routes (New Health Assessment)
// ============================================

/**
 * @route   GET /api/v1/counselor/assessments
 * @desc    Get all assessments created by counselor
 * @access  Private/Counselor
 */
router.get(
  '/assessments',
  authenticate,
  authorize('counselor'),
  assessmentController.getAssessments
);

/**
 * @route   POST /api/v1/counselor/assessments
 * @desc    Create new health assessment for a patient
 * @access  Private/Counselor
 */
router.post(
  '/assessments',
  authenticate,
  authorize('counselor'),
  assessmentController.createAssessment
);

/**
 * @route   GET /api/v1/counselor/assessments/:id
 * @desc    Get single assessment
 * @access  Private/Counselor
 */
router.get(
  '/assessments/:id',
  authenticate,
  authorize('counselor'),
  assessmentController.getAssessment
);

/**
 * @route   POST /api/v1/counselor/assessments/:id/predict
 * @desc    Request prediction for assessment
 * @access  Private/Counselor
 */
router.post(
  '/assessments/:id/predict',
  authenticate,
  authorize('counselor'),
  assessmentController.requestAssessmentPrediction
);

/**
 * @route   GET /api/v1/counselor/ml-status
 * @desc    Check ML service status
 * @access  Private/Counselor
 */
router.get(
  '/ml-status',
  authenticate,
  authorize('counselor'),
  assessmentController.getMLStatus
);

export default router;
