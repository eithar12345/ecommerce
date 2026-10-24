const mongoose = require('mongoose');

// منع تكرار الاتصال في Vercel
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log('Already connected to MongoDB');
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // 5 ثواني كفاية لـ Vercel
    });
    isConnected = db.connections[0].readyState;
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB Error:', error.message);
  }
};

connectDB();

module.exports = connectDB;