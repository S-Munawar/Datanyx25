import { Router, IRouter } from 'express';
import licenseController from '../controllers/license.controller';
import adminController from '../controllers/admin.controller';
import userController from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router: IRouter = Router();

// All routes require admin authentication
router.use(authenticate, authorize('admin'));

// ==================== Dashboard ====================

/**
 * @route   GET /api/v1/admin/dashboard
 * @desc    Get admin dashboard statistics
 * @access  Private/Admin
 */
router.get('/dashboard', adminController.getDashboardStats);

// ==================== User Management ====================

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users with pagination
 * @access  Private/Admin
 */
router.get('/users', userController.listUsers);

/**
 * @route   GET /api/v1/admin/users/:id
 * @desc    Get user by ID
 * @access  Private/Admin
 */
router.get('/users/:id', userController.getUserById);

/**
 * @route   PATCH /api/v1/admin/users/:id/status
 * @desc    Update user status
 * @access  Private/Admin
 */
router.patch('/users/:id/status', userController.updateUserStatus);

/**
 * @route   POST /api/v1/admin/users/:id/deactivate
 * @desc    Deactivate a user
 * @access  Private/Admin
 */
router.post('/users/:id/deactivate', userController.deactivateUser);

// ==================== License Management ====================

/**
 * @route   POST /api/v1/admin/licenses
 * @desc    Create a new license
 * @access  Private/Admin
 */
router.post('/licenses', licenseController.createLicense);

/**
 * @route   POST /api/v1/admin/licenses/bulk
 * @desc    Bulk create licenses
 * @access  Private/Admin
 */
router.post('/licenses/bulk', licenseController.bulkCreateLicenses);

/**
 * @route   GET /api/v1/admin/licenses
 * @desc    Get all licenses
 * @access  Private/Admin
 */
router.get('/licenses', licenseController.getLicenses);

/**
 * @route   GET /api/v1/admin/licenses/expiring-soon
 * @desc    Get licenses expiring soon
 * @access  Private/Admin
 */
router.get('/licenses/expiring-soon', licenseController.getExpiringLicenses);

/**
 * @route   GET /api/v1/admin/licenses/:id
 * @desc    Get license by ID
 * @access  Private/Admin
 */
router.get('/licenses/:id', licenseController.getLicense);

/**
 * @route   PUT /api/v1/admin/licenses/:id/revoke
 * @desc    Revoke a license
 * @access  Private/Admin
 */
router.put('/licenses/:id/revoke', licenseController.revokeLicense);

// ==================== Counselor Assignment ====================

/**
 * @route   POST /api/v1/admin/assign-counselor
 * @desc    Assign counselor to patient
 * @access  Private/Admin
 */
router.post('/assign-counselor', adminController.assignCounselor);

// ==================== Audit & Security ====================

/**
 * @route   GET /api/v1/admin/audit-logs
 * @desc    Get audit logs
 * @access  Private/Admin
 */
router.get('/audit-logs', adminController.getAuditLogs);

/**
 * @route   GET /api/v1/admin/security-stats
 * @desc    Get security statistics
 * @access  Private/Admin
 */
router.get('/security-stats', adminController.getSecurityStats);

// ==================== System ====================

/**
 * @route   GET /api/v1/admin/system-health
 * @desc    Get system health status
 * @access  Private/Admin
 */
router.get('/system-health', adminController.getSystemHealth);

/**
 * @route   GET /api/v1/admin/settings
 * @desc    Get system settings
 * @access  Private/Admin
 */
router.get('/settings', adminController.getSystemSettings);

/**
 * @route   PUT /api/v1/admin/settings
 * @desc    Update system settings
 * @access  Private/Admin
 */
router.put('/settings', adminController.updateSystemSettings);

export default router;
