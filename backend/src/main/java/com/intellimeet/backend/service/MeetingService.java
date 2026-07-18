package com.intellimeet.backend.service;

import com.intellimeet.backend.model.Meeting;
import com.intellimeet.backend.model.User;
import com.intellimeet.backend.repository.MeetingRepository;
import com.intellimeet.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class MeetingService {

    private static final String UPLOAD_DIR = "uploads/";

    @Autowired
    private MeetingRepository meetingRepository;

    @Autowired
    private UserRepository userRepository;

    // --- 1. EXISTING: MANUAL UPLOAD ---
    public Meeting saveMeeting(String userEmail, String title, MultipartFile audioFile, List<String> participantEmails) throws IOException {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        File directory = new File(UPLOAD_DIR);
        if (!directory.exists()) {
            directory.mkdirs();
        }

        String fileName = System.currentTimeMillis() + "_" + audioFile.getOriginalFilename();
        Path filePath = Paths.get(UPLOAD_DIR + fileName);
        Files.write(filePath, audioFile.getBytes());

        Meeting meeting = new Meeting();
        meeting.setTitle(title);
        meeting.setDate(LocalDateTime.now());
        meeting.setAudioFilePath(filePath.toString());
        meeting.setStatus("PROCESSING");
        meeting.setUser(user);

        // Default count for manual uploads is 1 unless emails are provided
        int pCount = (participantEmails != null && !participantEmails.isEmpty()) ? participantEmails.size() + 1 : 1;
        meeting.setParticipantsCount(pCount);

        if (participantEmails != null && !participantEmails.isEmpty()) {
            meeting.setParticipantEmails(participantEmails);
        }

        return meetingRepository.save(meeting);
    }

    // --- 2. DASHBOARD: HOSTED + ATTENDED ---
    public List<Meeting> getUserMeetings(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Calls the custom query you added to Repository
        return meetingRepository.findAllByUserIdOrParticipantEmail(user.getId(), email);
    }

    // --- 3. LIVE MEETING START ---
    public Meeting createLiveMeeting(String email, String title, String roomId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Meeting meeting = new Meeting();
        meeting.setTitle(title);
        meeting.setRoomId(roomId);
        meeting.setDate(LocalDateTime.now());
        meeting.setStatus("LIVE");
        meeting.setParticipantsCount(1); // Start with 1 (Host)
        meeting.setUser(user);

        return meetingRepository.save(meeting);
    }

    // --- 4. LIVE MEETING END ---
    public void endMeeting(String roomId) {
        Meeting meeting = meetingRepository.findByRoomId(roomId);
        if (meeting != null) {
            meeting.setStatus("COMPLETED");
            meetingRepository.save(meeting);
        }
    }

    // --- 5. RECORDING UPLOAD (UPDATED) ---
    public Meeting handleRecordingUpload(String email, String roomId, MultipartFile file) throws IOException {

        // A. Save the file
        String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
        Path uploadPath = Paths.get(UPLOAD_DIR);
        if (!Files.exists(uploadPath)) Files.createDirectories(uploadPath);
        Path filePath = uploadPath.resolve(fileName);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        Meeting meeting;

        // B. Find existing meeting
        if (roomId != null && !roomId.isEmpty()) {
            meeting = meetingRepository.findByRoomId(roomId);
        } else {
            meeting = null;
        }

        if (meeting != null) {
            // C. UPDATE EXISTING MEETING
            meeting.setAudioFilePath(filePath.toString());
            meeting.setStatus("Processing"); // FORCE status to Processing
            return meetingRepository.save(meeting);
        } else {
            // D. FALLBACK (Create new if not found)
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Meeting newMeeting = new Meeting();
            newMeeting.setTitle("Uploaded Meeting");
            newMeeting.setDate(LocalDateTime.now());
            newMeeting.setStatus("Processing");
            newMeeting.setUser(user);
            newMeeting.setAudioFilePath(filePath.toString());
            return meetingRepository.save(newMeeting);
        }
    }

    // --- Join Meeting Using Meeting ID ---
    public void joinMeeting(String roomId, String email) {
        Meeting meeting = meetingRepository.findByRoomId(roomId);
        if (meeting != null) {
            // 1. Increment Count
            meeting.setParticipantsCount(meeting.getParticipantsCount() + 1);

            // 2. Add Email to List (This fixes the Dashboard!)
            if (!meeting.getParticipantEmails().contains(email)) {
                meeting.getParticipantEmails().add(email);
            }

            meetingRepository.save(meeting);
        }
    }

    // Call this if AI fails
    public void markMeetingFailed(Long meetingId) {
        Meeting meeting = meetingRepository.findById(meetingId).orElse(null);
        if (meeting != null) {
            meeting.setStatus("FAILED");
            meetingRepository.save(meeting);
        }
    }

    // Call this when AI finishes
    public void saveTranscriptTitleAndSummary(Long meetingId, String text, String title, String summary) {
        Meeting meeting = meetingRepository.findById(meetingId).orElse(null);
        if (meeting != null) {
            meeting.setTranscript(text);
            meeting.setTitle(title); // <--- Save Gemini's new title
            meeting.setSummary(summary); // <--- Save Gemini's bullet points
            meeting.setStatus("COMPLETED");
            meetingRepository.save(meeting);
        }
    }

    public void saveTranscriptTitleAndSummary(Long meetingId, String title, String summary) {
        Meeting meeting = meetingRepository.findById(meetingId).orElse(null);
        if (meeting != null) {
            meeting.setTitle(title); // <--- Save Gemini's new title
            meeting.setSummary(summary); // <--- Save Gemini's bullet points
            meeting.setStatus("COMPLETED");
            meetingRepository.save(meeting);
        }
    }

    // --- NEW: Handle Partial Failures (Transcript OK, Gemini Failed) ---
    public void saveTranscriptWithFailedSummary(Long meetingId, String text) {
        Meeting meeting = meetingRepository.findById(meetingId).orElse(null);
        if (meeting != null) {
            meeting.setTranscript(text);
            meeting.setTitle("Meeting (AI Summary Failed)");
            meeting.setSummary(null); // IMPORTANT: Must be null so React shows the Retry button!
            meeting.setStatus("FAILED"); // IMPORTANT: Mark as failed
            meetingRepository.save(meeting);
        }
    }

    // --- NEW: SCHEDULE A FUTURE MEETING ---
    public Meeting scheduleMeeting(String email, String title, LocalDateTime date, List<String> participantEmails) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Meeting meeting = new Meeting();
        meeting.setTitle(title);
        meeting.setDate(date);
        meeting.setStatus("SCHEDULED"); // <-- Brand new status!
        meeting.setUser(user);

        // Calculate total participants (Host + Guests)
        int pCount = (participantEmails != null && !participantEmails.isEmpty()) ? participantEmails.size() + 1 : 1;
        meeting.setParticipantsCount(pCount);

        if (participantEmails != null && !participantEmails.isEmpty()) {
            meeting.setParticipantEmails(participantEmails);
        }

        return meetingRepository.save(meeting);
    }
}