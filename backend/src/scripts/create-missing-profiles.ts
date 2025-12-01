import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, PatientProfile, CounselorProfile, ResearcherProfile, License } from '../models';

dotenv.config();

async function createMissingProfiles() {
  console.log('\n🔧 Create Missing Profiles');
  console.log('===========================\n');
  
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found in environment');
    process.exit(1);
  }
  
  console.log('📡 Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB\n');
  
  try {
    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users\n`);
    
    for (const user of users) {
      const role = user.role;
      
      if (role === 'patient') {
        // Check if PatientProfile exists
        const existingProfile = await PatientProfile.findOne({ userId: user._id });
        if (!existingProfile) {
          const genders = ['male', 'female', 'other'] as const;
          const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
          
          const patientProfile = new PatientProfile({
            userId: user._id,
            dateOfBirth: new Date(1980 + Math.floor(Math.random() * 30), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
            gender: genders[Math.floor(Math.random() * genders.length)],
            bloodType: bloodTypes[Math.floor(Math.random() * bloodTypes.length)],
            medicalHistory: {
              conditions: ['Primary Immunodeficiency Suspected'],
              allergies: [],
              medications: [],
              familyHistory: true,
            },
            emergencyContact: {
              name: 'Emergency Contact',
              relationship: 'Family',
              phone: '555-0100',
            },
          });
          await patientProfile.save();
          console.log(`  ✅ Created PatientProfile for ${user.email}`);
        } else {
          console.log(`  ⏭️  PatientProfile already exists for ${user.email}`);
        }
      }
      
      if (role === 'counselor') {
        const existingProfile = await CounselorProfile.findOne({ userId: user._id });
        if (!existingProfile) {
          const counselorProfile = new CounselorProfile({
            userId: user._id,
            licenseId: user.licenseId,
            specialization: ['Primary Immunodeficiency', 'Pediatric Immunology'],
            yearsOfExperience: Math.floor(Math.random() * 20) + 5,
            institution: 'ImmunoDetect Medical Center',
            department: 'Immunology',
            credentials: {
              degree: ['MD', 'MD, PhD', 'DO'][Math.floor(Math.random() * 3)],
              field: 'Immunology',
              institution: 'Medical University',
              yearObtained: 2000 + Math.floor(Math.random() * 15),
            },
            availability: {
              monday: { available: true, slots: ['09:00-12:00', '14:00-17:00'] },
              tuesday: { available: true, slots: ['09:00-12:00', '14:00-17:00'] },
              wednesday: { available: true, slots: ['09:00-12:00'] },
              thursday: { available: true, slots: ['09:00-12:00', '14:00-17:00'] },
              friday: { available: true, slots: ['09:00-12:00'] },
              saturday: { available: false, slots: [] },
              sunday: { available: false, slots: [] },
            },
            stats: {
              totalPatients: 0,
              activePatients: 0,
              completedCases: 0,
              averageRating: 0,
            },
          });
          await counselorProfile.save();
          console.log(`  ✅ Created CounselorProfile for ${user.email}`);
        } else {
          console.log(`  ⏭️  CounselorProfile already exists for ${user.email}`);
        }
      }
      
      if (role === 'researcher') {
        const existingProfile = await ResearcherProfile.findOne({ userId: user._id });
        if (!existingProfile) {
          const researchFocusOptions = [
            ['Primary Immunodeficiency', 'Gene Therapy'],
            ['SCID', 'Newborn Screening'],
            ['Immunogenomics', 'Bioinformatics'],
          ];
          
          const researcherProfile = new ResearcherProfile({
            userId: user._id,
            licenseId: user.licenseId,
            researchFocus: researchFocusOptions[Math.floor(Math.random() * researchFocusOptions.length)],
            credentials: {
              degree: ['PhD', 'MD', 'MD-PhD'][Math.floor(Math.random() * 3)],
              field: 'Immunology',
              institution: ['Stanford', 'Harvard', 'Johns Hopkins', 'MIT'][Math.floor(Math.random() * 4)],
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
                description: 'Identifying novel biomarkers for early detection',
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
          console.log(`  ✅ Created ResearcherProfile for ${user.email}`);
        } else {
          console.log(`  ⏭️  ResearcherProfile already exists for ${user.email}`);
        }
      }
      
      if (role === 'admin') {
        console.log(`  ⏭️  Admin profile not required for ${user.email}`);
      }
    }
    
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB\n');
  }
}

createMissingProfiles();
