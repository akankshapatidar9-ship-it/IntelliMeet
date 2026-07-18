package com.intellimeet.backend.controller;

import com.intellimeet.backend.model.User;
import com.intellimeet.backend.repository.UserRepository;
import com.intellimeet.backend.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

@RestController
@RequestMapping("/api/auth")
//@CrossOrigin(origins = "http://localhost:5173") // Adjust to your React port
public class PasswordResetController {


    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // --- Endpoint 1: Send OTP ---
    @PostMapping("/forgot-password")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        Optional<User> userOptional = userRepository.findByEmail(email);

        if (userOptional.isEmpty()) {
            // Security best practice: Don't reveal if an email exists or not to hackers!
            // Just return OK, but don't actually send an email.
            return ResponseEntity.ok("If this email is registered, an OTP has been sent.");
        }

        User user = userOptional.get();

        // Generate 6-digit random OTP
        String otp = String.format("%06d", new Random().nextInt(999999));

        // Save to database with a 10-minute expiration
        user.setResetToken(otp);
        user.setResetTokenExpiry(LocalDateTime.now().plusMinutes(10));
        userRepository.save(user);

        // Send Email
        try {
            emailService.sendOtpEmail(user.getEmail(), otp);
            return ResponseEntity.ok("OTP sent successfully to your email.");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error sending email. Please try again.");
        }
    }

    // --- Endpoint 2: Verify & Reset ---
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String otp = request.get("otp");
        String newPassword = request.get("newPassword");

        Optional<User> userOptional = userRepository.findByEmail(email);

        if (userOptional.isEmpty()) {
            return ResponseEntity.badRequest().body("Invalid request.");
        }

        User user = userOptional.get();

        // 1. Check if OTP matches
        if (user.getResetToken() == null || !user.getResetToken().equals(otp)) {
            return ResponseEntity.badRequest().body("Invalid OTP.");
        }

        // 2. Check if OTP is expired
        if (user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body("OTP has expired. Please request a new one.");
        }

        // 3. Success! Encrypt new password and wipe the token
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);

        return ResponseEntity.ok("Password successfully reset! You can now log in.");
    }
}