package com.intellimeet.backend.controller;

import com.intellimeet.backend.model.User;
import com.intellimeet.backend.model.UserProfileUpdateRequest;
import com.intellimeet.backend.repository.UserRepository;
import com.intellimeet.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth") // All URLs in this file will start with /auth
//@CrossOrigin("*") // Allows React to talk to this later
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    // The endpoint: POST http://localhost:8080/auth/signup
    @PostMapping("/signup")
    public User signup(@RequestBody User user) {
        return userService.registerUser(user.getEmail(), user.getPassword(), user.getFullName());
    }

    // The endpoint: POST http://localhost:8080/auth/login
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginRequest) {
        try {
            User user = userService.loginUser(loginRequest.getEmail(), loginRequest.getPassword());
            return ResponseEntity.ok(user);
        } catch (RuntimeException e) {
            // This sends the specific message ("User not found" or "Invalid password")
            // sending 401 Unauthorized status
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }
    }

    @PutMapping("/{id}/profile")
    public ResponseEntity<?> updateUserProfile(@PathVariable Long id, @RequestBody UserProfileUpdateRequest request) {
        // Find the user
        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("User not found");
        }

        // Update details
        user.setFullName(request.getFullName());
        user.setProfileImage(request.getProfileImage());

        // Save to database
        userRepository.save(user);

        return ResponseEntity.ok(user);
    }

    public static class PasswordChangeRequest {
        public String email;
        public String currentPassword;
        public String newPassword;
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody PasswordChangeRequest request) {
        try {
            // 1. Find the user
            User user = userRepository.findByEmail(request.email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // 2. THE FIX: Use passwordEncoder.matches() instead of standard string .equals()
            if (!passwordEncoder.matches(request.currentPassword, user.getPassword())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Current password is incorrect.");
            }

            // 3. THE FIX: Encrypt the NEW password before saving it to the database!
            user.setPassword(passwordEncoder.encode(request.newPassword));
            userRepository.save(user);

            return ResponseEntity.ok("Password updated successfully.");

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error changing password: " + e.getMessage());
        }
    }
}