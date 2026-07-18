package com.intellimeet.backend.service;

import com.intellimeet.backend.model.User;
import com.intellimeet.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    // Inject the BCrypt blueprint we made earlier
    @Autowired
    private PasswordEncoder passwordEncoder;

    public User registerUser(String email, String password, String fullName) {
        // 1. Check if email already exists
        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("Email is already in use!");
        }

        // 2. Create the new user
        User newUser = new User();
        newUser.setEmail(email);

        // 3. SECURELY ENCRYPT THE PASSWORD BEFORE SAVING
        newUser.setPassword(passwordEncoder.encode(password));

        newUser.setFullName(fullName);

        // 4. Save to database
        return userRepository.save(newUser);
    }

    public User loginUser(String email, String password) {
        // 1. Find user by email
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found! Please Signup first."));

        // 2. SECURELY CHECK PASSWORD
        // .matches() automatically hashes the raw password they just typed and compares it to the database hash
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Invalid password");
        }

        return user;
    }
}