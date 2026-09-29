import { randomInt } from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User, { toPublicUser } from '../models/User.js';
import { sendOtpEmail } from '../services/email.js';

const router = Router();

router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password || !fullName) return res.status(400).send('Full name, email, and password are required.');
    if (await User.exists({ email: email.toLowerCase().trim() })) return res.status(409).send('Email is already in use!');
    const user = await User.create({ email, password: await bcrypt.hash(password, 12), fullName });
    return res.status(201).json(toPublicUser(user));
  } catch (error) {
    if (error.code === 11000) return res.status(409).send('Email is already in use!');
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email?.toLowerCase().trim() }).select('+password');
    if (!user) return res.status(401).send('User not found! Please Signup first.');
    if (!await bcrypt.compare(req.body.password || '', user.password)) return res.status(401).send('Invalid password');
    return res.json(toPublicUser(user));
  } catch (error) {
    return next(error);
  }
});

router.put('/:id/profile', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, {
      fullName: req.body.fullName,
      profileImage: req.body.profileImage ?? null
    }, { new: true, runValidators: true });
    if (!user) return res.status(404).send('User not found');
    return res.json(toPublicUser(user));
  } catch (error) {
    return next(error);
  }
});

router.post('/change-password', async (req, res, next) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase().trim() }).select('+password');
    if (!user) return res.status(404).send('User not found');
    if (!await bcrypt.compare(currentPassword || '', user.password)) return res.status(403).send('Current password is incorrect.');
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    return res.send('Password updated successfully.');
  } catch (error) {
    return next(error);
  }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email?.toLowerCase().trim() }).select('+resetToken +resetTokenExpiry');
    if (!user) return res.send('If this email is registered, an OTP has been sent.');
    const otp = String(randomInt(0, 1_000_000)).padStart(6, '0');
    user.resetToken = otp;
    user.resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    await sendOtpEmail(user.email, otp);
    return res.send('OTP sent successfully to your email.');
  } catch (error) {
    return next(error);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase().trim() }).select('+password +resetToken +resetTokenExpiry');
    if (!user || user.resetToken !== otp) return res.status(400).send('Invalid OTP.');
    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) return res.status(400).send('OTP has expired. Please request a new one.');
    user.password = await bcrypt.hash(newPassword, 12);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();
    return res.send('Password successfully reset! You can now log in.');
  } catch (error) {
    return next(error);
  }
});

export default router;