require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function fixAuthority() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const user = await User.findOne({
      email: 'authority@localpulse.org',
    }).select('+password');

    if (!user) {
      console.log('Authority user not found.');
      return;
    }

    user.password = 'demo123';
    user.role = 'authority';
    user.department = 'Roads & Infrastructure';

    await user.save();

    console.log('Authority account fixed successfully!');
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('Department:', user.department);
  } catch (error) {
    console.error('Fix failed:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

fixAuthority();