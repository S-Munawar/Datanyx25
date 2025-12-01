import { Request, Response, NextFunction } from 'express';
// Using global Express.Request type
import { License, User, AuditLog } from '../models';
import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * Generate License Number
 */
const generateLicenseNumber = (type: 'counselor' | 'researcher'): string => {
  const prefix = type === 'counselor' ? 'CLR' : 'RSR';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Create License
 * POST /api/v1/admin/licenses
 */
export const createLicense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admin = req.user!;
    const { type, expiresInDays, notes } = req.body;

    if (!type || !['counselor', 'researcher'].includes(type)) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid license type. Must be "counselor" or "researcher"',
      });
      return;
    }

    const licenseNumber = generateLicenseNumber(type);
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    const license = await License.create({
      licenseNumber,
      type,
      status: 'available',
      expiresAt,
      issuedBy: admin._id,
      notes,
    });

    // Log creation
    await AuditLog.create({
      action: 'license.create',
      userId: admin._id,
      targetId: license._id,
      targetType: 'License',
      description: `Admin created ${type} license ${licenseNumber}`,
      requestContext: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
      },
      success: true,
    });

    res.status(201).json({
      success: true,
      message: 'License created successfully',
      license: {
        id: license._id,
        licenseNumber: license.licenseNumber,
        type: license.type,
        status: license.status,
        expiresAt: license.expiresAt,
        createdAt: license.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Create license error:', error);
    res.status(500).json({
      success: false,
      error: 'CREATE_ERROR',
      message: 'Failed to create license',
    });
  }
};

/**
 * Bulk Create Licenses
 * POST /api/v1/admin/licenses/bulk
 */
export const bulkCreateLicenses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admin = req.user!;
    const { type, count, expiresInDays, notes } = req.body;

    if (!type || !['counselor', 'researcher'].includes(type)) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid license type',
      });
      return;
    }

    if (!count || count < 1 || count > 100) {
      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Count must be between 1 and 100',
      });
      return;
    }

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    const licenses = [];
    for (let i = 0; i < count; i++) {
      licenses.push({
        licenseNumber: generateLicenseNumber(type),
        type,
        status: 'available',
        expiresAt,
        issuedBy: admin._id,
        notes,
      });
    }

    const createdLicenses = await License.insertMany(licenses);

    // Log bulk creation
    await AuditLog.create({
      action: 'license.create',
      userId: admin._id,
      description: `Admin bulk created ${count} ${type} licenses`,
      requestContext: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
      },
      metadata: { count, type },
      success: true,
    });

    res.status(201).json({
      success: true,
      message: `${count} licenses created successfully`,
      licenses: createdLicenses.map((license) => ({
        id: license._id,
        licenseNumber: license.licenseNumber,
        type: license.type,
        status: license.status,
        expiresAt: license.expiresAt,
      })),
    });
  } catch (error: any) {
    console.error('Bulk create licenses error:', error);
    res.status(500).json({
      success: false,
      error: 'CREATE_ERROR',
      message: 'Failed to create licenses',
    });
  }
};

/**
 * Get All Licenses
 * GET /api/v1/admin/licenses
 */
export const getLicenses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query: Record<string, any> = {};
    if (type) query.type = type;
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const sort: Record<string, 1 | -1> = { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 };

    const [licenses, total] = await Promise.all([
      License.find(query)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .populate('claimedBy', 'firstName lastName email')
        .populate('issuedBy', 'firstName lastName'),
      License.countDocuments(query),
    ]);

    res.json({
      success: true,
      licenses: licenses.map((license) => ({
        id: license._id,
        licenseNumber: license.licenseNumber,
        type: license.type,
        status: license.status,
        claimedBy: license.claimedBy,
        claimedAt: license.claimedAt,
        expiresAt: license.expiresAt,
        issuedBy: license.issuedBy,
        notes: license.notes,
        createdAt: license.createdAt,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Get licenses error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch licenses',
    });
  }
};

/**
 * Get License by ID
 * GET /api/v1/admin/licenses/:id
 */
export const getLicense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const license = await License.findById(id)
      .populate('claimedBy', 'firstName lastName email profilePicture role')
      .populate('issuedBy', 'firstName lastName email');

    if (!license) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'License not found',
      });
      return;
    }

    res.json({
      success: true,
      license,
    });
  } catch (error: any) {
    console.error('Get license error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch license',
    });
  }
};

/**
 * Revoke License
 * PUT /api/v1/admin/licenses/:id/revoke
 */
export const revokeLicense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admin = req.user!;
    const { id } = req.params;
    const { reason } = req.body;

    const license = await License.findById(id);
    if (!license) {
      res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'License not found',
      });
      return;
    }

    if (license.status === 'revoked') {
      res.status(400).json({
        success: false,
        error: 'ALREADY_REVOKED',
        message: 'License is already revoked',
      });
      return;
    }

    const previousStatus = license.status;
    license.status = 'revoked';
    license.notes = reason ? `Revoked: ${reason}` : license.notes;
    await license.save();

    // If license was claimed, update the user
    if (license.claimedBy) {
      await User.findByIdAndUpdate(license.claimedBy, {
        $unset: { licenseId: 1 },
        status: 'suspended',
      });
    }

    // Log revocation
    await AuditLog.create({
      action: 'license.revoke',
      userId: admin._id,
      targetId: license._id,
      targetType: 'License',
      description: `Admin revoked license ${license.licenseNumber}`,
      requestContext: {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
      },
      changes: {
        before: { status: previousStatus },
        after: { status: 'revoked' },
      },
      metadata: { reason },
      success: true,
    });

    res.json({
      success: true,
      message: 'License revoked successfully',
      license: {
        id: license._id,
        licenseNumber: license.licenseNumber,
        status: license.status,
      },
    });
  } catch (error: any) {
    console.error('Revoke license error:', error);
    res.status(500).json({
      success: false,
      error: 'REVOKE_ERROR',
      message: 'Failed to revoke license',
    });
  }
};

/**
 * Get Expiring Licenses
 * GET /api/v1/admin/licenses/expiring-soon
 */
export const getExpiringLicenses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { days = 30 } = req.query;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + Number(days));

    const licenses = await License.find({
      status: 'claimed',
      expiresAt: { $lte: expiryDate, $gt: new Date() },
    })
      .sort({ expiresAt: 1 })
      .populate('claimedBy', 'firstName lastName email');

    res.json({
      success: true,
      licenses: licenses.map((license) => ({
        id: license._id,
        licenseNumber: license.licenseNumber,
        type: license.type,
        claimedBy: license.claimedBy,
        expiresAt: license.expiresAt,
        daysUntilExpiry: Math.ceil(
          (license.expiresAt!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ),
      })),
      count: licenses.length,
    });
  } catch (error: any) {
    console.error('Get expiring licenses error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Failed to fetch expiring licenses',
    });
  }
};

/**
 * Validate License (Public endpoint for registration)
 * GET /api/v1/licenses/validate/:licenseNumber
 */
export const validateLicense = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { licenseNumber } = req.params;
    const { type } = req.query;

    const license = await License.findOne({
      licenseNumber: licenseNumber.toUpperCase(),
      ...(type && { type }),
    });

    if (!license) {
      res.json({
        success: true,
        valid: false,
        message: 'License not found',
      });
      return;
    }

    const isValid = license.status === 'available' && 
      (!license.expiresAt || license.expiresAt > new Date());

    res.json({
      success: true,
      valid: isValid,
      license: isValid ? {
        type: license.type,
        expiresAt: license.expiresAt,
      } : undefined,
      message: !isValid
        ? license.status === 'claimed'
          ? 'License already claimed'
          : license.status === 'revoked'
          ? 'License has been revoked'
          : license.status === 'expired'
          ? 'License has expired'
          : 'License is not valid'
        : 'License is valid',
    });
  } catch (error: any) {
    console.error('Validate license error:', error);
    res.status(500).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Failed to validate license',
    });
  }
};

export default {
  createLicense,
  bulkCreateLicenses,
  getLicenses,
  getLicense,
  revokeLicense,
  getExpiringLicenses,
  validateLicense,
};
