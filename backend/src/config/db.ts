import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/easyacc';
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully (TypeScript)');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};
