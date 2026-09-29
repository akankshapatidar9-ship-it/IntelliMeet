import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import meetingRoutes from './routes/meetings.js';

const app = express();
const port = Number(process.env.PORT || 8080);
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((origin) => origin.trim());

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/meetings', meetingRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error instanceof mongoose.Error.ValidationError) return res.status(400).send(error.message);
  if (error instanceof mongoose.Error.CastError) return res.status(400).send('Invalid identifier.');
  if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).send('Recording exceeds the 100 MB limit.');
  return res.status(500).send(error.message || 'Internal server error');
});

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required. Copy backend-node/.env.example to backend-node/.env and configure it.');

await mongoose.connect(process.env.MONGODB_URI);
app.listen(port, () => console.log(`IntelliMeet API listening on http://localhost:${port}`));