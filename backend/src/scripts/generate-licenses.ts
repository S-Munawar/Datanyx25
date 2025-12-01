/**
 * Script to generate licenses for counselors and researchers
 * 
 * Usage:
 *   pnpm run generate-licenses -- --type counselor --count 10
 *   pnpm run generate-licenses -- --type researcher --count 5
 *   pnpm run generate-licenses -- --type both --count 10 --expires 365
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { License, LicenseType } from '../models';

// Load environment variables
dotenv.config();

interface GenerateOptions {
  type: 'counselor' | 'researcher' | 'both';
  count: number;
  expiresInDays?: number;
  prefix?: string;
}

/**
 * Generate a license number
 */
function generateLicenseNumber(type: LicenseType, prefix?: string): string {
  const typePrefix = type === 'counselor' ? 'CLR' : 'RSR';
  const customPrefix = prefix ? `${prefix}-` : '';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${customPrefix}${typePrefix}-${timestamp}-${random}`;
}

/**
 * Generate licenses
 */
async function generateLicenses(options: GenerateOptions): Promise<void> {
  const { type, count, expiresInDays, prefix } = options;
  
  const types: LicenseType[] = type === 'both' 
    ? ['counselor', 'researcher'] 
    : [type as LicenseType];
  
  const generatedLicenses: { licenseNumber: string; type: string }[] = [];
  
  for (const licenseType of types) {
    console.log(`\n📝 Generating ${count} ${licenseType} license(s)...`);
    
    for (let i = 0; i < count; i++) {
      const licenseNumber = generateLicenseNumber(licenseType, prefix);
      
      const expiresAt = expiresInDays 
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : undefined;
      
      try {
        const license = new License({
          licenseNumber,
          type: licenseType,
          status: 'available',
          expiresAt,
        });
        
        await license.save();
        generatedLicenses.push({ licenseNumber, type: licenseType });
        console.log(`  ✅ ${licenseNumber}`);
      } catch (error) {
        if ((error as any).code === 11000) {
          // Duplicate key error, retry with new number
          i--;
          continue;
        }
        console.error(`  ❌ Failed to create license: ${(error as Error).message}`);
      }
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 GENERATED LICENSES SUMMARY');
  console.log('='.repeat(60));
  
  const counselorLicenses = generatedLicenses.filter(l => l.type === 'counselor');
  const researcherLicenses = generatedLicenses.filter(l => l.type === 'researcher');
  
  if (counselorLicenses.length > 0) {
    console.log('\n🩺 COUNSELOR LICENSES:');
    counselorLicenses.forEach(l => console.log(`   ${l.licenseNumber}`));
  }
  
  if (researcherLicenses.length > 0) {
    console.log('\n🔬 RESEARCHER LICENSES:');
    researcherLicenses.forEach(l => console.log(`   ${l.licenseNumber}`));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`Total generated: ${generatedLicenses.length} license(s)`);
  if (expiresInDays) {
    console.log(`Expires in: ${expiresInDays} days`);
  }
  console.log('='.repeat(60) + '\n');
}

/**
 * Parse command line arguments
 */
function parseArgs(): GenerateOptions {
  const args = process.argv.slice(2);
  const options: GenerateOptions = {
    type: 'both',
    count: 5,
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--type':
      case '-t':
        const type = args[++i];
        if (type === 'counselor' || type === 'researcher' || type === 'both') {
          options.type = type;
        } else {
          console.error('Invalid type. Use: counselor, researcher, or both');
          process.exit(1);
        }
        break;
      
      case '--count':
      case '-c':
        const count = parseInt(args[++i], 10);
        if (isNaN(count) || count < 1) {
          console.error('Invalid count. Must be a positive number.');
          process.exit(1);
        }
        options.count = count;
        break;
      
      case '--expires':
      case '-e':
        const days = parseInt(args[++i], 10);
        if (isNaN(days) || days < 1) {
          console.error('Invalid expiry days. Must be a positive number.');
          process.exit(1);
        }
        options.expiresInDays = days;
        break;
      
      case '--prefix':
      case '-p':
        options.prefix = args[++i];
        break;
      
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }
  
  return options;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Generate Licenses Script
========================

Usage:
  pnpm run generate-licenses -- [options]

Options:
  -t, --type <type>      License type: counselor, researcher, or both (default: both)
  -c, --count <number>   Number of licenses to generate (default: 5)
  -e, --expires <days>   Expiration in days (optional, no expiry if not set)
  -p, --prefix <string>  Custom prefix for license numbers (optional)
  -h, --help             Show this help message

Examples:
  pnpm run generate-licenses -- --type counselor --count 10
  pnpm run generate-licenses -- --type researcher --count 5 --expires 365
  pnpm run generate-licenses -- --type both --count 10 --prefix PROMO
`);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const options = parseArgs();
  
  console.log('\n🔑 License Generator');
  console.log('====================\n');
  
  // Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI environment variable is not set');
    process.exit(1);
  }
  
  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
    
    // Generate licenses
    await generateLicenses(options);
    
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
