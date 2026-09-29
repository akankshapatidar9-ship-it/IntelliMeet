import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  fullName: { type: String, default: '' },
  profileImage: { type: String, default: null },
  resetToken: { type: String, default: null, select: false },
  resetTokenExpiry: { type: Date, default: null, select: false }
}, { timestamps: true });

export const toPublicUser = (user) => ({
  id: user._id.toString(),
  email: user.email,
  fullName: user.fullName,
  profileImage: user.profileImage ?? null
});

export default mongoose.model('User', userSchema);