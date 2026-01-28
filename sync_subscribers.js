const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const User = require('./models/User');
const Subscriber = require('./models/Subscriber');
const connectDB = require('./config/database');

const syncSubscribers = async () => {
    try {
        await connectDB();
        console.log('📦 Connected to Database');

        const users = await User.find({});
        console.log(`Found ${users.length} users to check.`);

        let addedCount = 0;
        let existCount = 0;

        for (const user of users) {
            // Handle case sensitivity
            const email = user.email.toLowerCase();

            const existing = await Subscriber.findOne({ email: email });

            if (!existing) {
                const newSub = new Subscriber({
                    email: email,
                    name: user.name || 'User', // User model might not have name
                    source: 'registration',
                    userId: user._id,
                    isActive: true
                });
                await newSub.save();
                console.log(`[+] Added subscriber: ${email}`);
                addedCount++;
            } else {
                existCount++;
                // Ensure userId is linked if missing
                if (!existing.userId) {
                    existing.userId = user._id;
                    await existing.save();
                    console.log(`[~] Linked User ID for: ${email}`);
                }
            }
        }

        console.log(`\n--- Sync Complete ---`);
        console.log(`Total Users Scanned: ${users.length}`);
        console.log(`New Subscribers Added: ${addedCount}`);
        console.log(`Existing Subscribers: ${existCount}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error during sync:', error);
        process.exit(1);
    }
};

syncSubscribers();
