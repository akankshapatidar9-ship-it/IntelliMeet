import nodemailer from 'nodemailer';

const createTransporter = () => {
  if (!process.env.MAIL_HOST || !process.env.MAIL_USERNAME || !process.env.MAIL_PASSWORD) {
    throw new Error('Email is not configured. Set MAIL_HOST, MAIL_USERNAME, and MAIL_PASSWORD.');
  }

  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    secure: Number(process.env.MAIL_PORT || 587) === 465,
    auth: { user: process.env.MAIL_USERNAME, pass: process.env.MAIL_PASSWORD }
  });
};

const send = async ({ to, subject, text }) => createTransporter().sendMail({
  from: process.env.MAIL_FROM || process.env.MAIL_USERNAME,
  to,
  subject,
  text
});

export const sendOtpEmail = (to, otp) => send({
  to,
  subject: 'IntelliMeet - Password Reset OTP',
  text: `Hello,\n\nYour password reset code is ${otp}. It expires in 10 minutes.\n\nIf you did not request this, please ignore this email.\n\nThe IntelliMeet Team`
});

export const sendMeetingInvite = (to, hostName, roomCode) => {
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
  return send({
    to,
    subject: "You're invited to an IntelliMeet video call!",
    text: `Hello!\n\n${hostName} invited you to an IntelliMeet meeting.\n\nJoin here: ${baseUrl}/room/${roomCode}\n\nThe IntelliMeet Team`
  });
};