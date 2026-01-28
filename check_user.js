const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findOne({ email: 'aman546u@gmail.com' });
        if (user) {
            console.log('User found:', user.email);
            console.log('OTP status:', user.otp);
        } else {
            console.log('User not found');
        }
        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkUser();
