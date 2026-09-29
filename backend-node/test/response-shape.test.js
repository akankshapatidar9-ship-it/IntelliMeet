import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Meeting, { toMeetingResponse } from '../src/models/Meeting.js';
import { toPublicUser } from '../src/models/User.js';

test('public user response omits password and preserves frontend fields', () => {
  const user = toPublicUser({
    _id: new mongoose.Types.ObjectId(),
    email: 'person@example.com',
    fullName: 'Meeting Host',
    profileImage: null,
    password: 'must-not-leak'
  });

  assert.deepEqual(Object.keys(user), ['id', 'email', 'fullName', 'profileImage']);
  assert.equal(user.email, 'person@example.com');
  assert.equal(user.profileImage, null);
});

test('meeting response keeps the field names and host shape used by React', () => {
  const id = new mongoose.Types.ObjectId();
  const hostId = new mongoose.Types.ObjectId();
  const meeting = toMeetingResponse({
    _id: id,
    title: 'Weekly Sync',
    roomId: 'MEET-123',
    date: '2026-09-26T14:30',
    audioFilePath: null,
    status: 'SCHEDULED',
    participantsCount: 2,
    transcript: null,
    summary: null,
    actionItems: null,
    user: { _id: hostId, email: 'host@example.com', fullName: 'Meeting Host', profileImage: null },
    participantEmails: ['guest@example.com']
  }, ['Meeting Host (Host)', 'guest@example.com']);

  assert.equal(meeting.id, id.toString());
  assert.equal(meeting.date, '2026-09-26T14:30');
  assert.equal(meeting.user.id, hostId.toString());
  assert.deepEqual(meeting.participantEmails, ['guest@example.com']);
  assert.deepEqual(meeting.participantNames, ['Meeting Host (Host)', 'guest@example.com']);
});

test('new meeting dates use the timezone-less format expected by the existing UI', () => {
  const meeting = new Meeting();
  assert.match(meeting.date, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
});