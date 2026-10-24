const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  try {
    const db = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      bufferCommands: false, 
    });
    isConnected = db.connections[0].readyState;
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB Error:', error.message);
  }
};

module.exports = connectDB; // بنصدر الدالة بس، عشان app.js يناديها ويستناها