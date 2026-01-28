const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const IPO = require('./models/IPO');
const connectDB = require('./config/database');

const checkIDs = async () => {
    try {
        await connectDB();
        const ipo = await IPO.findOne();
        if (ipo) {
            console.log('--- DB CHECK ---');
            console.log('Raw _id:', ipo._id); // Should be ObjectId(...)
            console.log('String _id:', ipo._id.toString());
            console.log('id virtual:', ipo.id);
            console.log('toObject:', JSON.stringify(ipo.toObject()));
        } else {
            console.log('No IPOs in DB');
        }
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

checkIDs();
