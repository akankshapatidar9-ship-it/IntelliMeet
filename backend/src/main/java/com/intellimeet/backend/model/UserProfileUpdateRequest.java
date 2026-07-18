package com.intellimeet.backend.model;

public class UserProfileUpdateRequest {
    private String fullName;
    private String profileImage;

    // Getters and Setters
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getProfileImage() { return profileImage; }
    public void setProfileImage(String profileImage) { this.profileImage = profileImage; }
}
