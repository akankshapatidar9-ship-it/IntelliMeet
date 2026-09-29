import { randomInt } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import Meeting, { toMeetingResponse } from '../models/Meeting.js';
import User, { toPublicUser } from '../models/User.js';
import { generateTitleAndSummary, transcribeAudio } from '../services/ai.js';
import { sendMeetingInvite } from '../services/email.js';

const router = Router();
const uploadDirectory = path.resolve(process.cwd(), 'uploads');
const storage = multer.diskStorage({
  destination: async (_req, _file, callback) => {
    try {
      await fs.mkdir(uploadDirectory, { recursive: true });
      callback(null, uploadDirectory);
    } catch (error) {
      callback(error);
    }
  },
  filename: (_req, file, callback) => callback(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`)
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });

const newRoomId = () => `MEET-${randomInt(0, 1_000_000)}`;
const getMeetingById = (id) => Meeting.findById(id).populate('user');

const toMeetingWithParticipants = async (meeting) => {
  const names = [];
  if (meeting.user?.fullName) names.push(`${meeting.user.fullName} (Host)`);
  for (const email of meeting.participantEmails || []) {
    const participant = await User.findOne({ email }).select('fullName');
    names.push(participant?.fullName || email);
  }
  return toMeetingResponse(meeting, names);
};

const processRecording = async (meetingId, filePath) => {
  let transcript = '';
  try {
    transcript = await transcribeAudio(filePath);
    const insights = await generateTitleAndSummary(transcript);
    await Meeting.findByIdAndUpdate(meetingId, {
      transcript,
      title: insights.title,
      summary: insights.summary,
      status: 'COMPLETED'
    });
  } catch (error) {
    console.error('Meeting AI processing failed:', error.message);
    if (transcript) {
      await Meeting.findByIdAndUpdate(meetingId, {
        transcript,
        title: 'Meeting (AI Summary Failed)',
        summary: null,
        status: 'FAILED'
      });
    } else {
      await Meeting.findByIdAndUpdate(meetingId, { status: 'FAILED' });
    }
  }
};

router.post('/join/:roomId', async (req, res, next) => {
  try {
    const meeting = await Meeting.findOne({ roomId: req.params.roomId });
    if (!meeting) return res.status(404).send('Meeting not found');
    const email = req.query.email;
    if (email) {
      if (!meeting.participantEmails.includes(email)) meeting.participantEmails.push(email);
      meeting.participantsCount += 1;
      await meeting.save();
    }
    return res.send('Joined successfully');
  } catch (error) {
    return next(error);
  }
});

router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).send('Recording file is required.');
    let meeting = req.body.roomId ? await Meeting.findOne({ roomId: req.body.roomId }) : null;
    if (meeting) {
      meeting.audioFilePath = req.file.path;
      meeting.status = 'PROCESSING';
      await meeting.save();
    } else {
      const user = await User.findOne({ email: req.body.email?.toLowerCase().trim() });
      if (!user) return res.status(404).send('User not found');
      meeting = await Meeting.create({
        title: 'Uploaded Meeting',
        date: new Date().toISOString().slice(0, 19),
        status: 'PROCESSING',
        user: user._id,
        audioFilePath: req.file.path
      });
    }
    void processRecording(meeting._id, meeting.audioFilePath);
    return res.json(toMeetingResponse(meeting));
  } catch (error) {
    return next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.query.email?.toLowerCase().trim() });
    if (!user) return res.json([]);
    const meetings = await Meeting.find({
      $or: [{ user: user._id }, { participantEmails: user.email }]
    }).populate('user').sort({ date: -1 });
    return res.json(await Promise.all(meetings.map(toMeetingWithParticipants)));
  } catch (error) {
    return next(error);
  }
});

router.get('/room/:roomId', async (req, res, next) => {
  try {
    const meeting = await Meeting.findOne({ roomId: req.params.roomId }).populate('user');
    if (!meeting) return res.status(404).end();
    return res.json(toMeetingResponse(meeting));
  } catch (error) {
    return next(error);
  }
});

router.post('/start', async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.query.email?.toLowerCase().trim() });
    if (!user) return res.status(404).send('User not found');
    const meeting = await Meeting.create({
      title: req.query.title || 'Instant Meeting',
      roomId: newRoomId(),
      date: new Date().toISOString().slice(0, 19),
      status: 'LIVE',
      participantsCount: 1,
      user: user._id
    });
    const response = toMeetingResponse(meeting);
    response.user = toPublicUser(user);
    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
});

router.post('/end', async (req, res, next) => {
  try {
    await Meeting.findOneAndUpdate({ roomId: req.query.roomId }, { status: 'COMPLETED' });
    return res.status(200).end();
  } catch (error) {
    return next(error);
  }
});

router.get('/:id/audio', async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting?.audioFilePath) return res.status(404).end();
    return res.sendFile(path.resolve(meeting.audioFilePath), (error) => {
      if (error && !res.headersSent) res.status(error.statusCode || 404).end();
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/retry-ai', async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).end();
    if (!meeting.transcript) return res.status(400).send('No transcript found to summarize.');
    meeting.status = 'PROCESSING';
    await meeting.save();
    void generateTitleAndSummary(meeting.transcript).then(async (insights) => {
      await Meeting.findByIdAndUpdate(meeting._id, { ...insights, status: 'COMPLETED' });
    }).catch(async (error) => {
      console.error('AI retry failed:', error.message);
      await Meeting.findByIdAndUpdate(meeting._id, { status: 'FAILED', summary: null });
    });
    return res.send('AI Retry Initiated successfully');
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/upload-live-audio', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).send('Recording file is required.');
    const meeting = await Meeting.findByIdAndUpdate(req.params.id, {
      audioFilePath: req.file.path,
      status: 'PROCESSING'
    }, { new: true });
    if (!meeting) return res.status(404).send('Meeting not found');
    void processRecording(meeting._id, meeting.audioFilePath);
    return res.send('Audio uploaded and processing started.');
  } catch (error) {
    return next(error);
  }
});

router.post('/schedule', async (req, res, next) => {
  try {
    const { title, date, hostEmail, participantEmails = [] } = req.body;
    const user = await User.findOne({ email: hostEmail?.toLowerCase().trim() });
    if (!user) return res.status(404).send('User not found');
    const meeting = await Meeting.create({
      title,
      date,
      status: 'SCHEDULED',
      roomId: newRoomId(),
      user: user._id,
      participantEmails,
      participantsCount: participantEmails.length + 1
    });
    const response = toMeetingResponse(meeting);
    response.user = toPublicUser(user);
    await Promise.all(participantEmails.map((email) =>
      sendMeetingInvite(email, user.fullName || 'The Host', meeting.roomId)
        .catch((error) => console.error(`Failed to send invite to ${email}:`, error.message))
    ));
    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
});

router.post('/:meetingId/launch', async (req, res, next) => {
  try {
    const meeting = await Meeting.findById(req.params.meetingId).populate('user');
    if (!meeting) return res.status(404).send('Meeting not found');
    if (meeting.user?.email !== req.query.hostEmail) return res.status(403).send('Only the host can launch this meeting.');
    meeting.status = 'LIVE';
    await meeting.save();
    return res.json({ roomCode: meeting.roomId });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const meeting = await getMeetingById(req.params.id);
    if (!meeting) return res.status(404).end();
    return res.json(await toMeetingWithParticipants(meeting));
  } catch (error) {
    return next(error);
  }
});

export default router;