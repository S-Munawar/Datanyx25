import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import patientRoutes from './patient.routes';
import counselorRoutes from './counselor.routes';
import researcherRoutes from './researcher.routes';
import adminRoutes from './admin.routes';
import licenseRoutes from './license.routes';
import assessmentRoutes from './assessment.routes';
import educatorRoutes from './educator.routes';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'ImmunoDetect API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/patient', patientRoutes);
router.use('/counselor', counselorRoutes);
router.use('/researcher', researcherRoutes);
router.use('/admin', adminRoutes);
router.use('/licenses', licenseRoutes);
router.use('/assessment', assessmentRoutes);
router.use('/educator', educatorRoutes);

export default router;
