# 🎥 IntelliMeet: AI-Powered Meeting Platform

IntelliMeet is a full-stack, real-time video conferencing application designed to make meetings smarter. Built with React and Spring Boot, it features high-quality video calls, scheduled meetings with automated email invitations, a secure Zoom-style waiting room, and an automated AI pipeline that records audio, generates transcripts, and creates smart meeting summaries.

---

## 🚀 Key Features

- **Real-Time Video/Audio:** High-fidelity, low-latency video rooms powered by ZegoCloud WebRTC.
- **Smart Scheduling:** Schedule meetings in advance. The system automatically sends secure room links via email and holds early joiners in a Waiting Room until the host arrives.
- **AI Meeting Minutes:** Automatically records meeting audio and processes it using **AssemblyAI** (Speech-to-Text) and **Google Gemini AI** (Smart Summarization & Action Items).
- **Robust Security:** JWT-ready architecture, BCrypt password encryption, secure OTP password resets, and route-protected React frontends.
- **User Preferences:** Dynamic settings page featuring Dark Mode, default camera/mic toggles, and secure credential management.

---

## 📸 Screenshots

<img width="1920" height="1080" alt="Screenshot (175)" src="https://github.com/user-attachments/assets/7b50223c-b857-41d0-ae74-7083ad7281f9" />
<p align="center">Dashboard</p>
<br>
<img width="1919" height="974" alt="Screenshot 2026-04-13 215422" src="https://github.com/user-attachments/assets/fad28abb-ffe6-4fb9-98cc-708d1e796a48" />
<p align="center">New Meeting Interface</p>
<br>
<img width="1920" height="1080" alt="Screenshot (181)" src="https://github.com/user-attachments/assets/d7ea9bd9-017c-4c5a-9a9a-36e61190abe3" />
<p align="center">Meeting Room</p>
<br>
<img width="1920" height="1080" alt="Screenshot (176)" src="https://github.com/user-attachments/assets/68367b7b-ee9a-4bcc-82df-2414d00ca7bb" />
<p align="center">View Transcript and Summary</p>
<br>


## ⚙️ Installation & Setup Guide

### Software Requirements

| Tool | Version |
|------|---------|
| Java Development Kit (JDK) | 21 or higher |
| Node.js & npm | 18.x or higher |
| MySQL Server | 8.x |
| Maven | Latest stable |

### API Keys Required

You will need to create free developer accounts and obtain API keys for the following services:

- [ZegoCloud](https://console.zegocloud.com/) — App ID & Server Secret
- [AssemblyAI](https://www.assemblyai.com/) — Transcription API Key
- [Google Gemini](https://aistudio.google.com/) — Generative AI API Key
- A Google Account with an **App Password** configured (for the email sender)

---

### Step-by-Step Execution

#### 1. Database Setup

Open MySQL Workbench or your CLI and create a new database schema:

```sql
CREATE DATABASE intellimeet_db;
```

#### 2. Backend Setup (Spring Boot)

1. Navigate to the `backend` directory.
2. Open `src/main/resources/application.properties` and fill in your credentials:

```properties
# MySQL Configuration
spring.datasource.url=jdbc:mysql://localhost:3306/intellimeet_db
spring.datasource.username=root
spring.datasource.password=YOUR_MYSQL_PASSWORD

# Email Configuration
spring.mail.username=your_email@gmail.com
spring.mail.password=YOUR_GOOGLE_APP_PASSWORD

# AI API Keys
gemini.api.key=YOUR_GEMINI_KEY
assemblyai.api.key=YOUR_ASSEMBLYAI_KEY
```

3. Run the backend application:

```bash
mvn spring-boot:run
```

> The backend will start on `http://localhost:8080`

---

#### 3. Frontend Setup (React + Vite)

1. Navigate to the `frontend` directory.
2. Create a `.env` file in the root of the frontend folder and add your ZegoCloud credentials:

```env
VITE_ZEGO_APP_ID=YOUR_ZEGOCLOUD_APP_ID
VITE_ZEGO_SERVER_SECRET=YOUR_ZEGOCLOUD_SERVER_SECRET
```

3. Install dependencies and start the development server:

```bash
npm install
npm run dev
```

> The frontend will start on `http://localhost:5173`

---

## 📖 User Manual

### Getting Started

1. **Onboarding:** Create a new account on the Signup page. If you forget your password, use the "Forgot Password" flow to receive a secure OTP via email.
2. **Dashboard:** Once logged in, your unified dashboard shows your Meeting History and upcoming scheduled calls.
3. **Starting a Meeting:**
   - Click **New Meeting** to generate an instant secure room.
   - Click **Schedule Meeting** to set a future date. Add participant emails and the system will automatically send out invitations.
4. **During the Meeting:** The Host is prompted to grant screen and audio permissions to enable AI recording. Once the host ends the call, audio is automatically sent to the server for processing.
5. **Reviewing Minutes:** Navigate to a completed meeting from your dashboard to view the generated transcript, speaker identification, and Gemini-generated smart summary.

### Navigation Guide

| Route | Description |
|-------|-------------|
| `/dashboard` | Your central hub for all active and past meetings |
| `/room/:roomId` | The live WebRTC video environment |
| `/meeting/:id` | Post-meeting view with audio player, transcript & AI summary |
| `/settings` | Manage profile, UI preferences (Dark Mode) & security credentials |

---

## 🔒 Permissions & Ethical Approvals

This application handles personal communication data and audio recordings. The following protocols have been implemented to ensure ethical data handling.

### Data Usage

- **Audio Processing:** Meeting audio is recorded strictly on the client side via the browser's `MediaRecorder` API. Audio is uploaded to the secure backend solely for transcription via AssemblyAI.
- **Third-Party AI Services:** Text transcripts are temporarily shared with Google's Gemini AI to generate meeting summaries. No personal user data (passwords, emails) is shared with third-party LLMs.
- **Data Retention:** Recorded `.webm` audio files are stored locally on the server in the `/uploads` directory and are linked exclusively to meeting participants in the MySQL database.

### User Consent Flow

- **Explicit Opt-In:** Before any audio is recorded, the Host is presented with a pre-flight consent modal explicitly stating that screen and audio will be captured for AI processing. Recording cannot commence without the Host pressing "Confirm" and explicitly granting browser-level media permissions.
- **Waiting Room Protocol:** Participants joining a scheduled meeting early are held in a secure Waiting Room. They cannot interact, be seen, or be recorded until the verified Host launches the session.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite |
| Backend | Spring Boot, Java 21 |
| Database | MySQL 8 |
| Video/Audio | ZegoCloud WebRTC |
| Transcription | AssemblyAI |
| AI Summarization | Google Gemini |
| Auth & Security | JWT, BCrypt, OTP via Email |

---

## 📄 License

This project was developed as a final-year Computer Science project. All rights reserved.
