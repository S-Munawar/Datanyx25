import { Router } from 'express';
import licenseController from '../controllers/license.controller';

const router = Router();

/**
 * @route   GET /api/v1/licenses/validate/:licenseNumber
 * @desc    Validate a license number (for registration)
 * @access  Public
 */
router.get('/validate/:licenseNumber', licenseController.validateLicense);

export default router;
