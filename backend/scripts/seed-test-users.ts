import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/user.model';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/immunodetect';

const testUsers = [
  // Patients
  {
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@example.com',
    password: 'password123',
    role: 'patient',
    dateOfBirth: new Date('1990-05-15'),
  },
  {
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@example.com',
    password: 'password123',
    role: 'patient',
    dateOfBirth: new Date('1985-08-22'),
  },
  {
    firstName: 'Michael',
    lastName: 'Williams',
    email: 'michael.williams@example.com',
    password: 'password123',
    role: 'patient',
    dateOfBirth: new Date('1978-12-03'),
  },
  {
    firstName: 'Emily',
    lastName: 'Davis',
    email: 'emily.davis@example.com',
    password: 'password123',
    role: 'patient',
    dateOfBirth: new Date('1995-03-10'),
  },
  {
    firstName: 'Robert',
    lastName: 'Brown',
    email: 'robert.brown@example.com',
    password: 'password123',
    role: 'patient',
    dateOfBirth: new Date('1982-07-28'),
  },
  // Counselors
  {
    firstName: 'Dr. Amanda',
    lastName: 'Wilson',
    email: 'amanda.wilson@example.com',
    password: 'password123',
    role: 'counselor',
  },
  {
    firstName: 'Dr. James',
    lastName: 'Taylor',
    email: 'james.taylor@example.com',
    password: 'password123',
    role: 'counselor',
  },
  // Researchers
  {
    firstName: 'Dr. Elizabeth',
    lastName: 'Anderson',
    email: 'elizabeth.anderson@example.com',
    password: 'password123',
    role: 'researcher',
  },
  {
    firstName: 'Dr. David',
    lastName: 'Martinez',
    email: 'david.martinez@example.com',
    password: 'password123',
    role: 'researcher',
  },
];

async function seedUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing users
    const deleted = await User.deleteMany({});
    console.log(`Deleted ${deleted.deletedCount} existing users`);

    // Create new users
    const createdUsers = [];
    for (const userData of testUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = new User({
        ...userData,
        password: hashedPassword,
        isVerified: true,
      });
      await user.save();
      createdUsers.push(user);
      console.log(`Created: ${user.email} (${user.role})`);
    }

    console.log(`\n✅ Successfully created ${createdUsers.length} test users`);
    console.log('\nTest Credentials:');
    console.log('----------------');
    console.log('Counselor: amanda.wilson@example.com / password123');
    console.log('Researcher: elizabeth.anderson@example.com / password123');
    console.log('Patient: john.smith@example.com / password123');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedUsers();
