/**
 * Fix MongoDB indexes for user collection
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixIndexes(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');
  
  try {
    // Drop the problematic index
    await mongoose.connection.collection('users').dropIndex('googleId_1');
    console.log('Dropped googleId_1 index');
  } catch (e) {
    console.log('Index may not exist or already fixed');
  }
  
  // Create a partial unique index that only applies when googleId exists and is not null
  try {
    await mongoose.connection.collection('users').createIndex(
      { googleId: 1 },
      { 
        unique: true,
        partialFilterExpression: { 
          googleId: { $type: 'string' } 
        }
      }
    );
    console.log('Created new partial unique index for googleId');
  } catch (e) {
    console.log('Index creation note:', (e as Error).message);
  }
  
  await mongoose.disconnect();
  console.log('Done');
}

fixIndexes();
