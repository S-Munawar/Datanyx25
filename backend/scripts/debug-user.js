// Debug login using the actual User model
const path = require('path');
require('ts-node/register');

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import the actual User model
const User = require('../src/models/user.model').default;

mongoose.connect('mongodb://localhost:27017/immunodetect').then(async () => {
  console.log('Connected to MongoDB');
  
  // Use the same query as the login controller
  const email = 'amanda.wilson@example.com';
  const password = 'password123';
  
  console.log('\n1. Finding user with select(+password)...');
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  
  console.log('User found:', !!user);
  if (user) {
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('Status:', user.status);
    console.log('Has password:', !!user.password);
    console.log('Password length:', user.password?.length);
    
    console.log('\n2. Testing bcrypt.compare...');
    const isValid = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isValid);
    
    console.log('\n3. Checking user methods...');
    console.log('isLocked:', typeof user.isLocked === 'function' ? user.isLocked() : 'N/A');
    console.log('getFullName:', typeof user.getFullName === 'function' ? user.getFullName() : 'N/A');
  }
  
  await mongoose.connection.close();
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
