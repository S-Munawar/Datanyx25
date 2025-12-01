import { Router } from 'express';
import { optionalAuth } from '../middlewares/auth';
import {
  createAssessment,
  getPredictionOnly,
  getMLStatus,
  getAssessments,
  getAssessmentById,
  getAvailablePatients,
} from '../controllers/publicAssessment.controller';

const router = Router();

// ML Status - no auth required
router.get('/ml-status', getMLStatus);

// Get prediction only (no save) - no auth required  
router.post('/predict', getPredictionOnly);

// Get available patients - optional auth
router.get('/patients', optionalAuth, getAvailablePatients);

// Create assessment - optional auth (saves user if logged in)
router.post('/', optionalAuth, createAssessment);

// Get all assessments - optional auth
router.get('/', optionalAuth, getAssessments);

// Get specific assessment
router.get('/:id', optionalAuth, getAssessmentById);

export default router;
