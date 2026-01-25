const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            // Mongoose 6+ doesn't need these options anymore
            // but keeping them won't cause issues
        });

        console.log('✅ MongoDB Atlas Connected Successfully');
        console.log(`📍 Database Host: ${conn.connection.host}`);
        console.log(`📊 Database Name: ${conn.connection.name}`);

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('⚠️ MongoDB disconnected');
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('MongoDB connection closed through app termination');
            process.exit(0);
        });

        return conn;
    } catch (error) {
        console.error('❌ MongoDB Atlas Connection Failed:', error.message);
        console.error('💡 Please check your connection string in .env file');
        console.error('💡 Make sure to:');
        console.error('   1. Replace <username> and <password> with your credentials');
        console.error('   2. Whitelist your IP address in MongoDB Atlas');
        console.error('   3. Check your network connection');
        process.exit(1);
    }
};

module.exports = connectDB;
