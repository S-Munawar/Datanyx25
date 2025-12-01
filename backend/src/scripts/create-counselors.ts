/**
 * Script to create test counselor accounts
 * 
 * Usage:
 *   pnpm run create-counselors -- --count 3 --license CLR-XXXXX
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User, License, GeneratedCredential, CounselorProfile } from '../models';

// Load environment variables
dotenv.config();

interface CounselorData {
  firstName: string;
  lastName: string;
  email: string;
}

// Sample counselor data
const sampleCounselors: CounselorData[] = [
  { firstName: 'Dr. Elizabeth', lastName: 'Chen', email: 'elizabeth.chen@immunodetect.com' },
  { firstName: 'Dr. Marcus', lastName: 'Thompson', email: 'marcus.thompson@immunodetect.com' },
  { firstName: 'Dr. Priya', lastName: 'Patel', email: 'priya.patel@immunodetect.com' },
  { firstName: 'Dr. James', lastName: 'Wilson', email: 'james.wilson@immunodetect.com' },
  { firstName: 'Dr. Maria', lastName: 'Garcia', email: 'maria.garcia@immunodetect.com' },
  { firstName: 'Dr. Ahmed', lastName: 'Hassan', email: 'ahmed.hassan@immunodetect.com' },
  { firstName: 'Dr. Sophie', lastName: 'Martin', email: 'sophie.martin@immunodetect.com' },
  { firstName: 'Dr. William', lastName: 'Lee', email: 'william.lee@immunodetect.com' },
];

/**
 * Generate a random password
 */
function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Create counselors
 */
async function createCounselors(count: number, specificLicense?: string): Promise<void> {
  const createdCounselors: { email: string; password: string; name: string; license: string }[] = [];
  
  console.log(`\n🩺 Creating ${count} counselor account(s)...\n`);
  
  // Get available counselor licenses
  let availableLicenses;
  if (specificLicense) {
    availableLicenses = await License.find({ 
      licenseNumber: specificLicense,
      type: 'counselor',
      status: 'available'
    });
    if (availableLicenses.length === 0) {
      console.error(`❌ License ${specificLicense} not found or not available`);
      return;
    }
  } else {
    availableLicenses = await License.find({ 
      type: 'counselor',
      status: 'available'
    }).limit(count);
  }
  
  if (availableLicenses.length === 0) {
    console.error('❌ No available counselor licenses found. Generate licenses first:');
    console.error('   pnpm run generate-licenses -- --type counselor --count 10');
    return;
  }
  
  if (availableLicenses.length < count) {
    console.warn(`⚠️  Only ${availableLicenses.length} license(s) available, creating that many counselors`);
    count = availableLicenses.length;
  }
  
  for (let i = 0; i < count; i++) {
    const counselorData = sampleCounselors[i % sampleCounselors.length];
    const password = generatePassword();
    const license = availableLicenses[i];
    
    // Make email unique if needed
    const emailSuffix = i >= sampleCounselors.length ? `${Math.floor(i / sampleCounselors.length)}` : '';
    const email = emailSuffix 
      ? counselorData.email.replace('@', `${emailSuffix}@`)
      : counselorData.email;
    
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        console.log(`  ⚠️  ${email} already exists, skipping...`);
        continue;
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Create user
      const user = new User({
        email,
        password: hashedPassword,
        firstName: counselorData.firstName,
        lastName: counselorData.lastName,
        role: 'counselor',
        status: 'active',
        emailVerified: true,
        licenseId: license._id,
      });
      
      await user.save();
      
      // Claim the license
      await license.claim(user._id);
      
      // Create counselor profile
      const specializations = [
        'Primary Immunodeficiency',
        'SCID',
        'Antibody Deficiencies',
        'Complement Disorders',
        'Phagocytic Disorders',
        'Immunogenetics',
      ];
      const institutions = [
        'Johns Hopkins Hospital',
        'Mayo Clinic',
        'Cleveland Clinic',
        'Massachusetts General Hospital',
        'Stanford Medical Center',
      ];
      
      const counselorProfile = new CounselorProfile({
        userId: user._id,
        licenseId: license._id,
        specialization: [
          specializations[Math.floor(Math.random() * specializations.length)],
          specializations[Math.floor(Math.random() * specializations.length)],
        ].filter((v, i, a) => a.indexOf(v) === i), // Remove duplicates
        yearsOfExperience: 5 + Math.floor(Math.random() * 20),
        institution: institutions[Math.floor(Math.random() * institutions.length)],
        department: 'Immunology',
        credentials: [{
          degree: 'MD',
          university: 'Medical University',
          yearGraduated: 2000 + Math.floor(Math.random() * 15),
        }],
        maxPatients: 30 + Math.floor(Math.random() * 30),
        currentPatientCount: 0,
        stats: {
          totalPatientsServed: 0,
          totalDiagnosesReviewed: 0,
          averageRating: 0,
          totalRatings: 0,
        },
      });
      
      await counselorProfile.save();
      
      // Store credentials in database
      const credential = new GeneratedCredential({
        userId: user._id,
        email,
        password, // Store plain text for test accounts
        role: 'counselor',
        firstName: counselorData.firstName,
        lastName: counselorData.lastName,
        licenseNumber: license.licenseNumber,
        notes: 'Generated by create-counselors script',
      });
      await credential.save();
      
      createdCounselors.push({
        email,
        password,
        name: `${counselorData.firstName} ${counselorData.lastName}`,
        license: license.licenseNumber,
      });
      
      console.log(`  ✅ Created: ${counselorData.firstName} ${counselorData.lastName} (License: ${license.licenseNumber}) (+ CounselorProfile)`);
      
    } catch (error) {
      console.error(`  ❌ Failed to create ${email}: ${(error as Error).message}`);
    }
  }
  
  // Print credentials summary
  if (createdCounselors.length > 0) {
    console.log('\n' + '='.repeat(90));
    console.log('🔐 COUNSELOR CREDENTIALS (Save these before they\'re gone!)');
    console.log('='.repeat(90));
    console.log('\n%-40s %-15s %-20s %s'.replace('%s', 'EMAIL').replace('%s', 'PASSWORD').replace('%s', 'NAME').replace('%s', 'LICENSE'));
    console.log('-'.repeat(90));
    
    for (const counselor of createdCounselors) {
      console.log(`${counselor.email.padEnd(40)} ${counselor.password.padEnd(15)} ${counselor.name.padEnd(20)} ${counselor.license}`);
    }
    
    console.log('\n' + '='.repeat(90));
    console.log(`Total created: ${createdCounselors.length} counselor(s)`);
    console.log('='.repeat(90) + '\n');
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): { count: number; license?: string } {
  const args = process.argv.slice(2);
  let count = 3;
  let license: string | undefined;
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--count':
      case '-c':
        count = parseInt(args[++i], 10);
        if (isNaN(count) || count < 1) {
          console.error('Invalid count. Must be a positive number.');
          process.exit(1);
        }
        break;
      case '--license':
      case '-l':
        license = args[++i];
        break;
      case '--help':
      case '-h':
        console.log(`
Create Counselors Script
========================

Usage:
  pnpm run create-counselors -- [options]

Options:
  -c, --count <number>     Number of counselors to create (default: 3)
  -l, --license <code>     Specific license code to use
  -h, --help               Show this help message

Note: Requires available counselor licenses. Generate them first:
  pnpm run generate-licenses -- --type counselor --count 10
`);
        process.exit(0);
    }
  }
  
  return { count, license };
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const { count, license } = parseArgs();
  
  console.log('\n🩺 Counselor Account Creator');
  console.log('============================\n');
  
  // Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI environment variable is not set');
    process.exit(1);
  }
  
  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Create counselors
    await createCounselors(count, license);
    
  } catch (error) {
    console.error('❌ Error:', (error as Error).message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run the script
main();
