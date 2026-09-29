import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
  title: { type: String, default: 'Untitled Meeting' },
  roomId: { type: String, default: null, index: true },
  date: { type: String, default: () => new Date().toISOString().slice(0, 19) },
  audioFilePath: { type: String, default: null },
  status: { type: String, default: 'LIVE' },
  participantsCount: { type: Number, default: 1 },
  transcript: { type: String, default: null },
  summary: { type: String, default: null },
  actionItems: { type: String, default: null },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participantEmails: { type: [String], default: [] }
}, { timestamps: true });

export const toMeetingResponse = (meeting, participantNames = []) => ({
  id: meeting._id.toString(),
  title: meeting.title,
  roomId: meeting.roomId,
  date: meeting.date,
  audioFilePath: meeting.audioFilePath,
  status: meeting.status,
  participantsCount: meeting.participantsCount,
  transcript: meeting.transcript,
  summary: meeting.summary,
  actionItems: meeting.actionItems,
  user: meeting.user && typeof meeting.user === 'object' && meeting.user._id
    ? {
        id: meeting.user._id.toString(),
        email: meeting.user.email,
        fullName: meeting.user.fullName,
        profileImage: meeting.user.profileImage ?? null
      }
    : meeting.user?.toString?.() ?? null,
  participantEmails: meeting.participantEmails ?? [],
  participantNames
});

export default mongoose.model('Meeting', meetingSchema);