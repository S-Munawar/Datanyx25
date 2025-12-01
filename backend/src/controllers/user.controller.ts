import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import {
  User,
  PatientProfile,
  CounselorProfile,
  ResearcherProfile,
  AdminProfile,
  AuditLog,
} from '../models';

/**
 * Get User Profile
 * GET /api/v1/users/profile
 */
export const getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;

    // Get role-specific profile
    let profile = null;
    switch (user.role) {
      case 'patient':
        profile = await PatientProfile.findOne({ userId: user._id })
          .populate('assignedCounselorId', 'firstName lastName email profilePicture');
        break;
      case 'counselor':
        profile = await CounselorProfile.findOne({ userId: user._id })
          .populate('licenseId');
        break;
      case 'researcher':
        profile = await ResearcherProfile.findOne({ userId: user._id })
          .populate('licenseId');
        break;
      case 'admin':
        profile = await AdminProfile.findOne({ userId: user._id });
        break;
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.getFullName(),
        profilePicture: user.profilePicture,
        role: user.role,
        status: user.status,
        preferences: user.preferences,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      profile,
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch profile',
    });
  }
};

/**
 * Update User Profile
 * PUT /api/v1/users/profile
 */
export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const { userUpdates, profileUpdates } = req.body;

    // Update basic user info (limited fields)
    if (userUpdates) {
      const allowedUserUpdates = ['firstName', 'lastName', 'preferences'];
      const filteredUpdates: Record<string, any> = {};

      for (const key of allowedUserUpdates) {
        if (userUpdates[key] !== undefined) {
          filteredUpdates[key] = userUpdates[key];
        }
      }

      await User.findByIdAndUpdate(user._id, filteredUpdates);
    }

    // Update role-specific profile
    if (profileUpdates) {
      switch (user.role) {
        case 'patient':
          await PatientProfile.findOneAndUpdate(
            { userId: user._id },
            profileUpdates,
            { new: true, upsert: true }
          );
          break;
        case 'counselor':
          await CounselorProfile.findOneAndUpdate(
            { userId: user._id },
            profileUpdates,
            { new: true }
          );
          break;
        case 'researcher':
          await ResearcherProfile.findOneAndUpdate(
            { userId: user._id },
            profileUpdates,
            { new: true }
          );
          break;
        case 'admin':
          // Admins can only update limited fields
          const allowedAdminUpdates = ['preferences'];
          const filteredAdminUpdates: Record<string, any> = {};
          for (const key of allowedAdminUpdates) {
            if (profileUpdates[key] !== undefined) {
              filteredAdminUpdates[key] = profileUpdates[key];
            }
          }
          break;
      }
    }

    // Log update
    await AuditLog.create({
      action: 'user.update',
      userId: user._id,
      targetId: user._id,
      targetType: 'User',
      description: `User ${user.email} updated their profile`,
      requestContext: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
      },
      success: true,
    });

    // Fetch updated profile
    const updatedUser = await User.findById(user._id);
    let updatedProfile = null;

    switch (user.role) {
      case 'patient':
        updatedProfile = await PatientProfile.findOne({ userId: user._id });
        break;
      case 'counselor':
        updatedProfile = await CounselorProfile.findOne({ userId: user._id });
        break;
      case 'researcher':
        updatedProfile = await ResearcherProfile.findOne({ userId: user._id });
        break;
      case 'admin':
        updatedProfile = await AdminProfile.findOne({ userId: user._id });
        break;
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser!._id,
        email: updatedUser!.email,
        firstName: updatedUser!.firstName,
        lastName: updatedUser!.lastName,
        fullName: updatedUser!.getFullName(),
        profilePicture: updatedUser!.profilePicture,
        role: updatedUser!.role,
        preferences: updatedUser!.preferences,
      },
      profile: updatedProfile,
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'UPDATE_ERROR',
      message: 'Failed to update profile',
    });
  }
};

/**
 * Update Profile Picture
 * PATCH /api/v1/users/profile/avatar
 */
export const updateAvatar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user!;
    const { profilePicture } = req.body;

    if (!profilePicture) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Profile picture URL is required',
      });
      return;
    }

    await User.findByIdAndUpdate(user._id, { profilePicture });

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      profilePicture,
    });
  } catch (error: any) {
    console.error('Update avatar error:', error);
    res.status(500).json({
      success: false,
      error: 'UPDATE_ERROR',
      message: 'Failed to update profile picture',
    });
  }
};

/**
 * Get User by ID (Admin only)
 * GET /api/v1/users/:id
 */
export const getUserById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'User not found',
      });
      return;
    }

    // Get profile
    let profile = null;
    switch (user.role) {
      case 'patient':
        profile = await PatientProfile.findOne({ userId: user._id });
        break;
      case 'counselor':
        profile = await CounselorProfile.findOne({ userId: user._id });
        break;
      case 'researcher':
        profile = await ResearcherProfile.findOne({ userId: user._id });
        break;
      case 'admin':
        profile = await AdminProfile.findOne({ userId: user._id });
        break;
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.getFullName(),
        profilePicture: user.profilePicture,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      profile,
    });
  } catch (error: any) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch user',
    });
  }
};

/**
 * List Users (Admin only)
 * GET /api/v1/users
 */
export const listUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query: Record<string, any> = {};

    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sort: Record<string, 1 | -1> = { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 };

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-googleId -activeSessions')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      users: users.map((user) => ({
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.getFullName(),
        profilePicture: user.profilePicture,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('List users error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch users',
    });
  }
};

/**
 * Update User Status (Admin only)
 * PATCH /api/v1/users/:id/status
 */
export const updateUserStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const admin = req.user!;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'User not found',
      });
      return;
    }

    const oldStatus = user.status;
    user.status = status;
    await user.save();

    // Log status change
    await AuditLog.create({
      action: status === 'suspended' ? 'user.suspend' : 'user.activate',
      userId: admin._id,
      targetId: user._id,
      targetType: 'User',
      description: `Admin ${admin.email} changed user ${user.email} status from ${oldStatus} to ${status}`,
      requestContext: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
      },
      changes: {
        before: { status: oldStatus },
        after: { status },
      },
      metadata: { reason },
      success: true,
    });

    res.json({
      success: true,
      message: `User status updated to ${status}`,
      user: {
        id: user._id,
        email: user.email,
        status: user.status,
      },
    });
  } catch (error: any) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      error: 'UPDATE_ERROR',
      message: 'Failed to update user status',
    });
  }
};

/**
 * Deactivate User (Admin only)
 * POST /api/v1/admin/users/:id/deactivate
 */
export const deactivateUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const admin = req.user!;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'User not found',
      });
      return;
    }

    // Prevent self-deactivation
    if (user._id.toString() === admin._id.toString()) {
      res.status(400).json({
        success: false,
        error: 'SELF_DEACTIVATION',
        message: 'Cannot deactivate your own account',
      });
      return;
    }

    user.status = 'inactive';
    await user.save();

    // Log deactivation
    await AuditLog.create({
      action: 'user.delete',
      userId: admin._id,
      targetId: user._id,
      targetType: 'User',
      description: `Admin ${admin.email} deactivated user ${user.email}`,
      requestContext: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
      },
      metadata: { reason },
      success: true,
    });

    res.json({
      success: true,
      message: 'User deactivated successfully',
    });
  } catch (error: any) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      error: 'DEACTIVATE_ERROR',
      message: 'Failed to deactivate user',
    });
  }
};

/**
 * Change Password
 * POST /api/v1/users/change-password
 */
export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Current password and new password are required',
      });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'New password must be at least 8 characters',
      });
      return;
    }

    // Get user with password
    const user = await User.findById(userId).select('+password');
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'User not found',
      });
      return;
    }

    // Check if user has a password (might be OAuth only user)
    if (!user.password) {
      res.status(400).json({
        success: false,
        error: 'NO_PASSWORD',
        message: 'Cannot change password for OAuth-only accounts. Please set a password first.',
      });
      return;
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: 'INVALID_PASSWORD',
        message: 'Current password is incorrect',
      });
      return;
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    // Log password change
    await AuditLog.create({
      action: 'user.password_change',
      userId: user._id,
      targetId: user._id,
      targetType: 'User',
      description: `User ${user.email} changed their password`,
      requestContext: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
      },
      success: true,
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'CHANGE_PASSWORD_ERROR',
      message: 'Failed to change password',
    });
  }
};

/**
 * Update Preferences
 * PATCH /api/v1/users/preferences
 */
export const updatePreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { preferences } = req.body;

    if (!preferences) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Preferences are required',
      });
      return;
    }

    // Validate preference keys
    const allowedPreferences = ['notifications', 'emailAlerts', 'language', 'timezone'];
    const updates: Record<string, any> = {};

    for (const key of Object.keys(preferences)) {
      if (allowedPreferences.includes(key)) {
        updates[`preferences.${key}`] = preferences[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'No valid preferences provided',
      });
      return;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: user?.preferences,
    });
  } catch (error: any) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'UPDATE_ERROR',
      message: 'Failed to update preferences',
    });
  }
};

/**
 * Upload Profile Picture
 * POST /api/v1/users/profile-picture
 */
export const uploadProfilePicture = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!._id;

    // This assumes multer or similar middleware has processed the file
    // For now, we'll just update with the URL if provided
    const { profilePictureUrl } = req.body;

    if (!profilePictureUrl && !req.file) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Profile picture is required',
      });
      return;
    }

    // In production, you'd upload to S3/GCS and get the URL
    const pictureUrl = profilePictureUrl || `/uploads/profile-pictures/${req.file?.filename}`;

    await User.findByIdAndUpdate(userId, { profilePicture: pictureUrl });

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      profilePicture: pictureUrl,
    });
  } catch (error: any) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({
      success: false,
      error: 'UPLOAD_ERROR',
      message: 'Failed to upload profile picture',
    });
  }
};

export default {
  getProfile,
  updateProfile,
  updateAvatar,
  getUserById,
  listUsers,
  updateUserStatus,
  deactivateUser,
  changePassword,
  updatePreferences,
  uploadProfilePicture,
};
