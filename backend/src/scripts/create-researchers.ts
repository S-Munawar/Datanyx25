/**
 * Script to create test researcher accounts
 * 
 * Usage:
 *   pnpm run create-researchers -- --count 3 --license RSR-XXXXX
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User, License, GeneratedCredential, ResearcherProfile } from '../models';

// Load environment variables
dotenv.config();

interface ResearcherData {
  firstName: string;
  lastName: string;
  email: string;
}

// Sample researcher data
const sampleResearchers: ResearcherData[] = [
  { firstName: 'Dr. waasi', lastName: 'Uddin', email: 'waasi.uddin@research.immunodetect.com' },
  { firstName: 'Dr. Katherine', lastName: 'Zhang', email: 'katherine.zhang@research.immunodetect.com' },
  { firstName: 'Dr. Robert', lastName: 'Kumar', email: 'robert.kumar@research.immunodetect.com' },
  { firstName: 'Dr. Sarah', lastName: 'O\'Brien', email: 'sarah.obrien@research.immunodetect.com' },
  { firstName: 'Dr. Michael', lastName: 'Nakamura', email: 'michael.nakamura@research.immunodetect.com' },
  { firstName: 'Dr. Elena', lastName: 'Volkov', email: 'elena.volkov@research.immunodetect.com' },
  { firstName: 'Dr. David', lastName: 'Okonkwo', email: 'david.okonkwo@research.immunodetect.com' },
  { firstName: 'Dr. Lisa', lastName: 'Anderson', email: 'lisa.anderson@research.immunodetect.com' },
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
 * Create researchers
 */
async function createResearchers(count: number, specificLicense?: string): Promise<void> {
  const createdResearchers: { email: string; password: string; name: string; license: string }[] = [];
  
  console.log(`\n🔬 Creating ${count} researcher account(s)...\n`);
  
  // Get available researcher licenses
  let availableLicenses;
  if (specificLicense) {
    availableLicenses = await License.find({ 
      licenseNumber: specificLicense,
      type: 'researcher',
      status: 'available'
    });
    if (availableLicenses.length === 0) {
      console.error(`❌ License ${specificLicense} not found or not available`);
      return;
    }
  } else {
    availableLicenses = await License.find({ 
      type: 'researcher',
      status: 'available'
    }).limit(count);
  }
  
  if (availableLicenses.length === 0) {
    console.error('❌ No available researcher licenses found. Generate licenses first:');
    console.error('   pnpm run generate-licenses -- --type researcher --count 10');
    return;
  }
  
  if (availableLicenses.length < count) {
    console.warn(`⚠️  Only ${availableLicenses.length} license(s) available, creating that many researchers`);
    count = availableLicenses.length;
  }
  
  for (let i = 0; i < count; i++) {
    const researcherData = sampleResearchers[i % sampleResearchers.length];
    const password = generatePassword();
    const license = availableLicenses[i];
    
    // Make email unique if needed
    const emailSuffix = i >= sampleResearchers.length ? `${Math.floor(i / sampleResearchers.length)}` : '';
    const email = emailSuffix 
      ? researcherData.email.replace('@', `${emailSuffix}@`)
      : researcherData.email;
    
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
        firstName: researcherData.firstName,
        lastName: researcherData.lastName,
        role: 'researcher',
        status: 'active',
        emailVerified: true,
        licenseId: license._id,
      });
      
      await user.save();
      
      // Create ResearcherProfile
      const researchFocusOptions = [
        ['Primary Immunodeficiency', 'Gene Therapy'],
        ['SCID', 'Newborn Screening'],
        ['Immunogenomics', 'Bioinformatics'],
        ['T-cell Development', 'Thymic Function'],
        ['B-cell Disorders', 'Antibody Deficiencies'],
      ];
      
      const researcherProfile = new ResearcherProfile({
        userId: user._id,
        licenseId: license._id,
        researchFocus: researchFocusOptions[Math.floor(Math.random() * researchFocusOptions.length)],
        credentials: {
          degree: ['PhD', 'MD', 'MD-PhD'][Math.floor(Math.random() * 3)],
          field: 'Immunology',
          institution: ['Stanford University', 'Harvard Medical School', 'Johns Hopkins University', 'MIT'][Math.floor(Math.random() * 4)],
          yearObtained: 2000 + Math.floor(Math.random() * 20),
        },
        institution: 'ImmunoDetect Research Institute',
        department: 'Immunogenomics Research',
        dataAccessLevel: (['basic', 'advanced', 'full'] as const)[Math.floor(Math.random() * 3)],
        publications: [
          {
            title: 'Advances in SCID Detection Methods',
            journal: 'Journal of Immunology',
            year: 2023,
            doi: '10.1000/example.2023.001',
          },
        ],
        currentProjects: [
          {
            name: 'Immunodeficiency Biomarker Discovery',
            description: 'Identifying novel biomarkers for early detection of primary immunodeficiencies',
            status: 'active',
            startDate: new Date('2024-01-01'),
          },
        ],
        stats: {
          datasetsAccessed: 0,
          analysesRun: 0,
          publicationsCount: 1,
          citationsCount: 0,
        },
      });
      await researcherProfile.save();
      
      // Claim the license
      await license.claim(user._id);
      
      // Store credentials in database
      const credential = new GeneratedCredential({
        userId: user._id,
        email,
        password, // Store plain text for test accounts
        role: 'researcher',
        firstName: researcherData.firstName,
        lastName: researcherData.lastName,
        licenseNumber: license.licenseNumber,
        notes: 'Generated by create-researchers script',
      });
      await credential.save();
      
      createdResearchers.push({
        email,
        password,
        name: `${researcherData.firstName} ${researcherData.lastName}`,
        license: license.licenseNumber,
      });
      
      console.log(`  ✅ Created: ${researcherData.firstName} ${researcherData.lastName} (License: ${license.licenseNumber})`);
      
    } catch (error) {
      console.error(`  ❌ Failed to create ${email}: ${(error as Error).message}`);
    }
  }
  
  // Print credentials summary
  if (createdResearchers.length > 0) {
    console.log('\n' + '='.repeat(100));
    console.log('🔐 RESEARCHER CREDENTIALS (Save these before they\'re gone!)');
    console.log('='.repeat(100));
    console.log('\n%-45s %-15s %-22s %s'.replace('%s', 'EMAIL').replace('%s', 'PASSWORD').replace('%s', 'NAME').replace('%s', 'LICENSE'));
    console.log('-'.repeat(100));
    
    for (const researcher of createdResearchers) {
      console.log(`${researcher.email.padEnd(45)} ${researcher.password.padEnd(15)} ${researcher.name.padEnd(22)} ${researcher.license}`);
    }
    
    console.log('\n' + '='.repeat(100));
    console.log(`Total created: ${createdResearchers.length} researcher(s)`);
    console.log('='.repeat(100) + '\n');
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
Create Researchers Script
=========================

Usage:
  pnpm run create-researchers -- [options]

Options:
  -c, --count <number>     Number of researchers to create (default: 3)
  -l, --license <code>     Specific license code to use
  -h, --help               Show this help message

Note: Requires available researcher licenses. Generate them first:
  pnpm run generate-licenses -- --type researcher --count 10
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
  
  console.log('\n🔬 Researcher Account Creator');
  console.log('=============================\n');
  
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
    
    // Create researchers
    await createResearchers(count, license);
    
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
