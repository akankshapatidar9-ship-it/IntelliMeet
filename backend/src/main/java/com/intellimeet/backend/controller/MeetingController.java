package com.intellimeet.backend.controller;

import com.intellimeet.backend.model.Meeting;
import com.intellimeet.backend.model.User;
import com.intellimeet.backend.repository.MeetingRepository;
import com.intellimeet.backend.repository.UserRepository;
import com.intellimeet.backend.service.EmailService;
import com.intellimeet.backend.service.GeminiService;
import com.intellimeet.backend.service.MeetingService;
import com.intellimeet.backend.service.TranscriptionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/meetings")
//@CrossOrigin("*") // Allow React to access this
public class MeetingController {

    @Autowired
    private MeetingService meetingService;

    @Autowired
    private MeetingRepository meetingRepository;

    @Autowired
    private TranscriptionService transcriptionService;

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    public static class ScheduleRequest {
        public String title;
        public String date; // React will send this as an ISO string (e.g., "2026-03-25T14:30")
        public String hostEmail;
        public List<String> participantEmails;
    }

    @PostMapping("/join/{roomId}")
    public ResponseEntity<?> joinMeeting(
            @PathVariable String roomId,
            @RequestParam String email) {
        try {
            meetingService.joinMeeting(roomId, email);
            return ResponseEntity.ok("Joined successfully");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error joining meeting");
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadMeeting(
            @RequestParam("file") MultipartFile file,
            @RequestParam("email") String email,
            @RequestParam(value = "roomId", required = false) String roomId) {

        try {
            // 1. Save File & Set Status "PROCESSING"
            Meeting meeting = meetingService.handleRecordingUpload(email, roomId, file);

            // 2. Start AI Thread (Runs in background)
            // Inside the background thread...
            new Thread(() -> {
                String transcriptText = ""; // Declare outside so the catch block can see it
                try {
                    // 1. Get raw transcript from AssemblyAI
                    transcriptText = transcriptionService.transcribeAudio(meeting.getAudioFilePath());

                    // 2. Pass transcript to Gemini for Title & Summary
                    Map<String, String> geminiInsights = geminiService.generateTitleAndSummary(transcriptText);
                    String newTitle = geminiInsights.get("title");
                    String newSummary = geminiInsights.get("summary");

                    // 3. Save everything to the Database
                    meetingService.saveTranscriptTitleAndSummary(meeting.getId(), transcriptText, newTitle, newSummary);

                } catch (Exception e) {
                    System.err.println("❌ AI Processing Pipeline Failed: " + e.getMessage());

                    // --- GRACEFUL FALLBACK LOGIC ---
                    if (transcriptText != null && !transcriptText.isEmpty()) {
                        // Scenario A: AssemblyAI worked, but Gemini crashed.
                        System.out.println("⚠️ Saving Transcript without Gemini Summary...");

                        // Use our new method! Sets summary to null and status to FAILED.
                        meetingService.saveTranscriptWithFailedSummary(meeting.getId(), transcriptText);
                    } else {
                        // Scenario B: AssemblyAI completely failed (e.g. DNS issue).
                        System.out.println("🛑 Total AI Failure (Transcript failed).");

                        // Mark the whole meeting as FAILED so it doesn't get stuck on PROCESSING forever.
                        meetingService.markMeetingFailed(meeting.getId());
                    }
                }
            }).start();

            return ResponseEntity.ok(meeting);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }

    @GetMapping
    public List<Meeting> getMeetings(@RequestParam("email") String email) {
        return meetingService.getUserMeetings(email);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Meeting> getMeetingById(@PathVariable Long id) {
        Meeting meeting = meetingRepository.findById(id).orElse(null);

        if (meeting == null) {
            return ResponseEntity.notFound().build();
        }

        // --- MAP EMAILS TO ACTUAL NAMES ---
        List<String> names = new ArrayList<>();

        // 1. Add the Host
        if (meeting.getUser() != null) {
            names.add(meeting.getUser().getFullName() + " (Host)");
        }

        // 2. Lookup each participant by email
        if (meeting.getParticipantEmails() != null) {
            for (String email : meeting.getParticipantEmails()) {
                // Try to find the user in the database
                User participant = userRepository.findByEmail(email).orElse(null);

                if (participant != null && participant.getFullName() != null) {
                    names.add(participant.getFullName()); // Found them! Add full name.
                } else {
                    names.add(email); // Not a registered user? Fallback to showing their email.
                }
            }
        }

        // Attach the names to the Meeting object (React will see this!)
        meeting.setParticipantNames(names);

        return ResponseEntity.ok(meeting);
    }

    @PostMapping("/start")
    public Meeting startMeeting(
            @RequestParam("email") String email,
            @RequestParam("title") String title) {

        // 1. Generate a random Room ID (e.g., "MEET-123456")
        String roomId = "MEET-" + (int)(Math.random() * 1000000);

        // 2. Save it to the database (Logic inside Controller for simplicity now)
        // Ideally, move this logic to Service, but this works for now.
        return meetingService.createLiveMeeting(email, title, roomId);
    }

    @PostMapping("/end")
    public void endMeeting(@RequestParam("roomId") String roomId) {
        meetingService.endMeeting(roomId);
    }

    @GetMapping("/{id}/audio")
    public ResponseEntity<Resource> getMeetingAudio(@PathVariable Long id) {
        try {
            // 1. Find the meeting
            Meeting meeting = meetingRepository.findById(id).orElse(null);
            if (meeting == null || meeting.getAudioFilePath() == null) {
                return ResponseEntity.notFound().build();
            }

            // 2. Locate the file on your computer/server
            Path filePath = Paths.get(meeting.getAudioFilePath()).toAbsolutePath().normalize();
            Resource resource = new UrlResource(filePath.toUri());

            // 3. Stream it to the browser
            if (resource.exists() && resource.isReadable()) {
                return ResponseEntity.ok()
                        // Generic audio type so it plays MP3, WAV, M4A, etc.
                        .contentType(MediaType.parseMediaType("audio/mpeg"))
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/{id}/retry-ai")
    public ResponseEntity<?> retryAISummary(@PathVariable Long id) {
        try {
            // 1. Find the meeting
            Meeting meeting = meetingRepository.findById(id).orElse(null);
            if (meeting == null) {
                return ResponseEntity.notFound().build();
            }

            // 2. Safety Check: Can't summarize if there's no transcript!
            if (meeting.getTranscript() == null || meeting.getTranscript().isEmpty()) {
                return ResponseEntity.badRequest().body("No transcript found to summarize.");
            }

            String transcriptText = meeting.getTranscript();
            // 3. Set status back to PROCESSING so the React UI switches to the loading animation
            meeting.setStatus("PROCESSING");
            meetingRepository.save(meeting);

            // 4. TRIGGER YOUR AI SERVICE HERE
            // Note: Replace the line below with whatever method you use to call Gemini!
            // It probably looks something like this:
            // myAiService.generateSummary(meeting.getId(), meeting.getTranscript());
            Map<String, String> geminiInsights = geminiService.generateTitleAndSummary(transcriptText);
            String newTitle = geminiInsights.get("title");
            String newSummary = geminiInsights.get("summary");

            meetingService.saveTranscriptTitleAndSummary(meeting.getId(), newTitle, newSummary);


            return ResponseEntity.ok().body("AI Retry Initiated successfully");

        } catch (Exception e) {
            System.err.println("Retry AI failed: " + e.getMessage());
            return ResponseEntity.internalServerError().body("Error starting AI: " + e.getMessage());
        }
    }

    @PostMapping("/{id}/upload-live-audio")
    public ResponseEntity<?> uploadLiveAudio(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        try {
            Meeting meeting = meetingRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Meeting not found"));

            // 1. Save the audio file locally
            // We use .webm because that is the default format browsers record in!
            String fileName = "live_meeting_" + id + "_" + System.currentTimeMillis() + ".webm";
            java.nio.file.Path uploadPath = java.nio.file.Paths.get("uploads/");
            if (!java.nio.file.Files.exists(uploadPath)) {
                java.nio.file.Files.createDirectories(uploadPath);
            }
            java.nio.file.Path filePath = uploadPath.resolve(fileName);
            file.transferTo(filePath.toFile());

            // 2. Update the meeting status to PROCESSING
            meeting.setAudioFilePath(filePath.toString());
            meeting.setStatus("PROCESSING");
            meetingRepository.save(meeting);

            // 3. Start the AI Background Thread (Just like your regular upload!)
            new Thread(() -> {
                String transcriptText = "";
                try {
                    // Step A: AssemblyAI Transcription
                    transcriptText = transcriptionService.transcribeAudio(meeting.getAudioFilePath());

                    // Step B: Gemini Summary
                    Map<String, String> geminiInsights = geminiService.generateTitleAndSummary(transcriptText);

                    // Step C: Save Success
                    meetingService.saveTranscriptTitleAndSummary(
                            meeting.getId(),
                            transcriptText,
                            geminiInsights.get("title"),
                            geminiInsights.get("summary")
                    );

                } catch (Exception e) {
                    System.err.println("❌ Live AI Processing Failed: " + e.getMessage());
                    if (transcriptText != null && !transcriptText.isEmpty()) {
                        meetingService.saveTranscriptWithFailedSummary(meeting.getId(), transcriptText);
                    } else {
                        meetingService.markMeetingFailed(meeting.getId());
                    }
                }
            }).start();

            return ResponseEntity.ok("Audio uploaded and processing started.");

        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error saving live audio: " + e.getMessage());
        }
    }

    @GetMapping("/room/{roomId}")
    public ResponseEntity<?> getMeetingByRoomId(@PathVariable String roomId) {
        Meeting meeting = meetingRepository.findByRoomId(roomId);
        if (meeting == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(meeting);
    }

    @PostMapping("/schedule")
    public ResponseEntity<?> scheduleMeeting(@RequestBody ScheduleRequest request) {
        try {
            LocalDateTime meetingDate = LocalDateTime.parse(request.date);

            // 1. Save the meeting to the DB
            Meeting scheduledMeeting = meetingService.scheduleMeeting(
                    request.hostEmail, request.title, meetingDate, request.participantEmails
            );

            // 2. Generate the Room ID NOW
            String roomCode = "MEET-" + (int)(Math.random() * 1000000);
            scheduledMeeting.setRoomId(roomCode);
            meetingRepository.save(scheduledMeeting);

            // 3. Send the emails NOW
            String joinLink = "http://localhost:5173/room/" + roomCode;
            if (request.participantEmails != null) {
                // Get host name securely
                String hostName = scheduledMeeting.getUser() != null ? scheduledMeeting.getUser().getFullName() : "The Host";
                for (String email : request.participantEmails) {
                    try {
                        emailService.sendMeetingInvite(email, hostName, joinLink);
                    } catch (Exception e) {
                        System.err.println("Failed to send invite to: " + email);
                    }
                }
            }

            return ResponseEntity.ok(scheduledMeeting);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to schedule meeting: " + e.getMessage());
        }
    }

    @PostMapping("/{meetingId}/launch")
    public ResponseEntity<?> launchMeeting(@PathVariable Long meetingId, @RequestParam String hostEmail) {
        try {
            Meeting meeting = meetingRepository.findById(meetingId)
                    .orElseThrow(() -> new RuntimeException("Meeting not found"));

            String actualHostEmail = meeting.getUser() != null ? meeting.getUser().getEmail() : "";
            if (!actualHostEmail.equals(hostEmail)) {
                return ResponseEntity.status(403).body("Only the host can launch this meeting.");
            }

            // ONLY change the status to LIVE! No more duplicate emails or new IDs.
            meeting.setStatus("LIVE");
            meetingRepository.save(meeting);

            return ResponseEntity.ok(Map.of("roomCode", meeting.getRoomId()));

        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error launching meeting: " + e.getMessage());
        }
    }
}