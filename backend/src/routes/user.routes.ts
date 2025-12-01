import { Router, IRouter } from 'express';
import userController from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router: IRouter = Router();

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get current user's profile
 * @access  Private
 */
router.get('/profile', authenticate, userController.getProfile);

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update current user's profile (full update)
 * @access  Private
 */
router.put('/profile', authenticate, userController.updateProfile);

/**
 * @route   PATCH /api/v1/users/profile
 * @desc    Update current user's profile (partial update)
 * @access  Private
 */
router.patch('/profile', authenticate, userController.updateProfile);

/**
 * @route   PATCH /api/v1/users/profile/avatar
 * @desc    Update profile picture
 * @access  Private
 */
router.patch('/profile/avatar', authenticate, userController.updateAvatar);

/**
 * @route   POST /api/v1/users/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', authenticate, userController.changePassword);

/**
 * @route   PATCH /api/v1/users/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.patch('/preferences', authenticate, userController.updatePreferences);

/**
 * @route   POST /api/v1/users/profile-picture
 * @desc    Upload profile picture
 * @access  Private
 */
router.post('/profile-picture', authenticate, userController.uploadProfilePicture);

/**
 * @route   GET /api/v1/users
 * @desc    List all users (admin only)
 * @access  Private/Admin
 */
router.get('/', authenticate, authorize('admin'), userController.listUsers);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID (admin only)
 * @access  Private/Admin
 */
router.get('/:id', authenticate, authorize('admin'), userController.getUserById);

/**
 * @route   PATCH /api/v1/users/:id/status
 * @desc    Update user status (admin only)
 * @access  Private/Admin
 */
router.patch('/:id/status', authenticate, authorize('admin'), userController.updateUserStatus);

export default router;
