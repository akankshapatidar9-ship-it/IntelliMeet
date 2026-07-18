package com.intellimeet.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void sendOtpEmail(String toEmail, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("your_project_email@gmail.com"); // Matches application.properties
        message.setTo(toEmail);
        message.setSubject("IntelliMeet - Password Reset OTP");
        message.setText("Hello,\n\n" +
                "You requested a password reset. Your 6-digit OTP is: " + otp + "\n\n" +
                "This code will expire in 10 minutes. If you did not request this, please ignore this email.\n\n" +
                "Best,\nThe IntelliMeet Team");

        mailSender.send(message);
    }

    public void sendMeetingInvite(String participantEmail, String hostName, String meetingLink) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("your_project_email@gmail.com"); // Match your application.properties
        message.setTo(participantEmail);
        message.setSubject("You're invited to an IntelliMeet video call!");
        message.setText("Hello!\n\n" +
                hostName + " has launched a scheduled meeting and is waiting for you to join.\n\n" +
                "Click the link below to join the room instantly:\n" +
                meetingLink + "\n\n" +
                "Best,\nThe IntelliMeet Team");

        mailSender.send(message);
    }
}