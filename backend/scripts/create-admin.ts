import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import readline from 'readline';
import { User, AdminProfile } from '../src/models';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
};

async function createAdmin() {
  console.log('\n🔐 ImmunoDetect Admin Creation Script\n');
  console.log('═'.repeat(50));

  try {
    // Connect to MongoDB
    console.log('\n📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');

    // Gather admin details
    console.log('Please enter the admin details:\n');

    const email = await question('Email: ');
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.role === 'admin') {
        console.log('\n⚠️  This user is already an admin!');
        rl.close();
        await mongoose.disconnect();
        process.exit(0);
      }
      
      const upgrade = await question(`\nUser exists with role "${existingUser.role}". Upgrade to admin? (yes/no): `);
      if (upgrade.toLowerCase() === 'yes' || upgrade.toLowerCase() === 'y') {
        existingUser.role = 'admin';
        await existingUser.save();

        // Create admin profile
        await AdminProfile.findOneAndUpdate(
          { userId: existingUser._id },
          {
            userId: existingUser._id,
            permissions: {
              manageUsers: true,
              manageLicenses: true,
              manageSystem: true,
              viewAuditLogs: true,
              manageData: true,
            },
            adminLevel: 'super',
          },
          { upsert: true, new: true }
        );

        console.log(`\n✅ User ${email} upgraded to admin successfully!`);
        rl.close();
        await mongoose.disconnect();
        process.exit(0);
      } else {
        console.log('\n❌ Cancelled.');
        rl.close();
        await mongoose.disconnect();
        process.exit(0);
      }
    }

    const firstName = await question('First Name: ');
    const lastName = await question('Last Name: ');
    const googleId = await question('Google ID (leave empty to generate): ');
    
    const adminLevelInput = await question('Admin Level (standard/super) [super]: ');
    const adminLevel = adminLevelInput === 'standard' ? 'standard' : 'super';

    // Create admin user
    console.log('\n📝 Creating admin user...');

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const [user] = await User.create(
        [
          {
            email,
            firstName,
            lastName,
            googleId: googleId || `admin_${Date.now()}`,
            role: 'admin',
            status: 'active',
            lastLoginAt: new Date(),
          },
        ],
        { session }
      );

      await AdminProfile.create(
        [
          {
            userId: user._id,
            permissions: {
              manageUsers: true,
              manageLicenses: true,
              manageSystem: adminLevel === 'super',
              viewAuditLogs: true,
              manageData: adminLevel === 'super',
            },
            adminLevel,
          },
        ],
        { session }
      );

      await session.commitTransaction();

      console.log('\n' + '═'.repeat(50));
      console.log('✅ Admin user created successfully!\n');
      console.log('  Email:', email);
      console.log('  Name:', firstName, lastName);
      console.log('  Role: admin');
      console.log('  Admin Level:', adminLevel);
      console.log('  User ID:', user._id.toString());
      console.log('\n' + '═'.repeat(50));
      console.log('\n💡 The admin can log in using Google OAuth with this email.');
      console.log('   Make sure the Google account email matches:', email);
      console.log('');

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
}

createAdmin();
