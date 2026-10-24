const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // بنحاول نتصل بالداتابيز
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // 5 ثواني كفاية
    });
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Error:', error.message);
  }
};

// بننفذ الاتصال
connectDB();

module.exports = connectDB;