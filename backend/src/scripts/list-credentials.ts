/**
 * Script to list all generated test credentials from the database
 * 
 * Usage:
 *   pnpm run list-credentials
 *   pnpm run list-credentials -- --role patient
 *   pnpm run list-credentials -- --role counselor
 *   pnpm run list-credentials -- --role researcher
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { GeneratedCredential } from '../models';

// Load environment variables
dotenv.config();

/**
 * List credentials
 */
async function listCredentials(role?: string): Promise<void> {
  const query = role ? { role } : {};
  const credentials = await GeneratedCredential.find(query).sort({ role: 1, createdAt: -1 });
  
  if (credentials.length === 0) {
    console.log('\n📭 No credentials found in database.\n');
    return;
  }
  
  // Group by role
  const grouped = credentials.reduce((acc, cred) => {
    if (!acc[cred.role]) acc[cred.role] = [];
    acc[cred.role].push(cred);
    return acc;
  }, {} as Record<string, typeof credentials>);
  
  console.log('\n' + '='.repeat(100));
  console.log('🔐 STORED TEST CREDENTIALS');
  console.log('='.repeat(100));
  
  for (const [role, creds] of Object.entries(grouped)) {
    const icon = role === 'patient' ? '👥' : role === 'counselor' ? '🩺' : role === 'researcher' ? '🔬' : '👤';
    console.log(`\n${icon} ${role.toUpperCase()}S (${creds.length}):`);
    console.log('-'.repeat(100));
    console.log(`${'EMAIL'.padEnd(45)} ${'PASSWORD'.padEnd(15)} ${'NAME'.padEnd(25)} ${'LICENSE'}`);
    console.log('-'.repeat(100));
    
    for (const cred of creds) {
      const name = `${cred.firstName} ${cred.lastName}`;
      console.log(
        `${cred.email.padEnd(45)} ${cred.password.padEnd(15)} ${name.padEnd(25)} ${cred.licenseNumber || '-'}`
      );
    }
  }
  
  console.log('\n' + '='.repeat(100));
  console.log(`Total: ${credentials.length} credential(s)`);
  console.log('='.repeat(100) + '\n');
}

/**
 * Parse command line arguments
 */
function parseArgs(): string | undefined {
  const args = process.argv.slice(2);
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--role':
      case '-r':
        const role = args[++i];
        if (!['patient', 'counselor', 'researcher', 'admin'].includes(role)) {
          console.error('Invalid role. Use: patient, counselor, researcher, or admin');
          process.exit(1);
        }
        return role;
      case '--help':
      case '-h':
        console.log(`
List Credentials Script
=======================

Usage:
  pnpm run list-credentials -- [options]

Options:
  -r, --role <role>   Filter by role: patient, counselor, researcher, admin
  -h, --help          Show this help message
`);
        process.exit(0);
    }
  }
  
  return undefined;
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const role = parseArgs();
  
  console.log('\n📋 Credential Viewer');
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
    console.log('✅ Connected to MongoDB');
    
    // List credentials
    await listCredentials(role);
    
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
