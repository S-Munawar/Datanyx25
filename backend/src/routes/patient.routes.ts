import { Router, IRouter } from 'express';
import multer from 'multer';
import healthRecordController from '../controllers/healthRecord.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router: IRouter = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

/**
 * @route   POST /api/v1/patient/health-records
 * @desc    Create a new health record
 * @access  Private/Patient
 */
router.post(
  '/health-records',
  authenticate,
  authorize('patient'),
  healthRecordController.createHealthRecord
);

/**
 * @route   GET /api/v1/patient/health-records
 * @desc    Get all health records for current patient
 * @access  Private (any authenticated user can view their own records)
 */
router.get(
  '/health-records',
  authenticate,
  healthRecordController.getHealthRecords
);

/**
 * @route   GET /api/v1/patient/health-records/:id
 * @desc    Get a specific health record
 * @access  Private/Patient
 */
router.get(
  '/health-records/:id',
  authenticate,
  authorize('patient'),
  healthRecordController.getHealthRecord
);

/**
 * @route   PUT /api/v1/patient/health-records/:id
 * @desc    Update a health record
 * @access  Private/Patient
 */
router.put(
  '/health-records/:id',
  authenticate,
  authorize('patient'),
  healthRecordController.updateHealthRecord
);

/**
 * @route   DELETE /api/v1/patient/health-records/:id
 * @desc    Delete a health record
 * @access  Private/Patient
 */
router.delete(
  '/health-records/:id',
  authenticate,
  authorize('patient'),
  healthRecordController.deleteHealthRecord
);

/**
 * @route   POST /api/v1/patient/health-records/:id/gene-file
 * @desc    Upload gene expression CSV file
 * @access  Private/Patient
 */
router.post(
  '/health-records/:id/gene-file',
  authenticate,
  authorize('patient'),
  upload.single('geneFile'),
  healthRecordController.uploadGeneFile
);

/**
 * @route   GET /api/v1/patient/health-records/:id/gene-file/download
 * @desc    Get download URL for gene expression file
 * @access  Private/Patient
 */
router.get(
  '/health-records/:id/gene-file/download',
  authenticate,
  authorize('patient'),
  healthRecordController.getGeneFileDownloadUrl
);

/**
 * @route   POST /api/v1/patient/health-records/:id/share
 * @desc    Share health record with counselor/researcher
 * @access  Private/Patient
 */
router.post(
  '/health-records/:id/share',
  authenticate,
  authorize('patient'),
  healthRecordController.shareHealthRecord
);

/**
 * @route   POST /api/v1/patient/health-records/:id/predict
 * @desc    Request AI prediction for health record
 * @access  Private/Patient
 */
router.post(
  '/health-records/:id/predict',
  authenticate,
  authorize('patient'),
  healthRecordController.requestPrediction
);

export default router;
