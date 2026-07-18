import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import axios from 'axios';
import Swal from 'sweetalert2';

const VideoRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isHost = location.state?.isHost || false;
  const [joined, setJoined] = useState(!isHost); 
  const [isUploading, setIsUploading] = useState(false); 
  
  // --- NEW: WAITING ROOM STATE ---
  const [isWaitingForHost, setIsWaitingForHost] = useState(false);

  // Refs for Recording
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRefs = useRef([]); 
  const zpRef = useRef(null); // Keep track of Zego instance
  const participantCountRef = useRef(1); 

  const user = JSON.parse(localStorage.getItem('user')) || { fullName: 'Guest', id: Date.now().toString() };

  // --- NEW: WAITING ROOM POLLING LOGIC ---
  useEffect(() => {
    let pollingInterval;

    const checkMeetingStatus = async () => {
      try {
        // Ping the backend to check if the meeting is SCHEDULED, LIVE, or COMPLETED
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/meetings/room/${roomId}`);
        const meeting = response.data;

        // If it's still SCHEDULED and we are just a guest...
        if (!isHost && meeting.status === 'SCHEDULED') {
            setIsWaitingForHost(true);
            setJoined(false); // Prevent Zego from initializing
        } 
        // The exact moment the host clicks "Launch" and the DB flips to LIVE...
        else if (!isHost && meeting.status === 'LIVE') {
            setIsWaitingForHost(false);
            setJoined(true); // Let them into the room!
            clearInterval(pollingInterval); // Stop asking the server
        }
      } catch (error) {
        console.error("Could not check meeting status:", error);
      }
    };

    // Only non-hosts (guests) need to wait in the waiting room
    if (!isHost) {
        checkMeetingStatus(); // Check immediately when they open the link
        pollingInterval = setInterval(checkMeetingStatus, 3000); // Check again every 3 seconds
    }

    // Cleanup interval if they leave the page early
    return () => clearInterval(pollingInterval);
  }, [roomId, isHost]);

  // --- RECORDING & UPLOAD LOGIC ---
  const startRecordingAndJoin = async () => {
    try {
      // 1. Beautiful "Pre-Flight" Popup
      const result = await Swal.fire({
        title: '<strong>Ready to Record?</strong>',
        icon: 'info',
        html: `
          <div style="text-align: left; font-size: 16px;">
            <p>To generate the <b>AI Transcript</b>, you must:</p>
            <ul>
              <li>Select <b>'Entire Screen'</b> (or this Tab)</li>
              <li>Check <b>'Share System Audio'</b></li>
            </ul>
          </div>
        `,
        showCancelButton: true,
        focusConfirm: false,
        confirmButtonText: '<i class="bi bi-camera-video"></i> Start Meeting',
        confirmButtonColor: '#0d6efd',
        cancelButtonText: 'Cancel'
      });

      if (!result.isConfirmed) return;

      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      streamRefs.current = [...screenStream.getTracks(), ...micStream.getTracks()];

      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();
      
      if (screenStream.getAudioTracks().length > 0) {
        audioContext.createMediaStreamSource(screenStream).connect(destination);
      }
      audioContext.createMediaStreamSource(micStream).connect(destination);

      const mixedStream = new MediaStream([...screenStream.getVideoTracks(), ...destination.stream.getAudioTracks()]);
      const mediaRecorder = new MediaRecorder(mixedStream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      
      mediaRecorder.onstop = async () => {
        setIsUploading(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'video/webm' });
        await uploadRecording(audioBlob);
        
        if (streamRefs.current) {
            streamRefs.current.forEach(track => track.stop());
        }
        navigate('/dashboard'); 
      };

      mediaRecorder.start();
      setJoined(true); 

    } catch (err) {
      console.error(err);
      Swal.fire({
        title: 'Permission Denied',
        text: 'Permission Denied! Cannot start meeting!',
        icon: 'error'
      });
    }
  };

  const uploadRecording = async (blob) => {
    const formData = new FormData();
    const file = new File([blob], `meeting-${roomId}.webm`, { type: 'video/webm' });
    
    formData.append('file', file);
    formData.append('email', user.email);
    formData.append('roomId', roomId); 
    
    try {
      Swal.fire({
        title: 'Uploading...',
        text: 'Please wait while we save the meeting data.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/meetings/upload`, formData); 
      Swal.fire({
        title: 'Saved!',
        text: 'Meeting saved & AI Transcript generating.',
        icon: 'success',
        timer: 3000, 
        showConfirmButton: false
      });
    } catch (error) {
      console.error("Upload failed", error);
      Swal.fire({
        title: 'Upload Failed',
        text: 'Could not save the meeting audio.',
        icon: 'error'
      });
    }
  };

  // --- STABILIZED ZEGO LOGIC ---
  const myMeeting = useCallback(async (element) => {
    if (!element) return; 
    
    // --- 1. NUCLEAR SANITATION (Strips ALL special characters & spaces) ---
    let safeRoomId = roomId ? String(roomId).replace(/[^a-zA-Z0-9]/g, "") : "";
    if (!safeRoomId) safeRoomId = "backup-room-" + Date.now(); // Fallback if empty

    let safeUserId = user?.id ? String(user.id).replace(/[^a-zA-Z0-9]/g, "") : "";
    if (!safeUserId) safeUserId = "user-" + Date.now(); // Fallback if empty

    let safeUserName = user?.fullName ? String(user.fullName).substring(0, 30) : "Guest";

    // --- 2. PRINT TO CONSOLE TO DEBUG ---
    console.log("=== ZEGO PRE-FLIGHT CHECK ===");
    console.log("1. Safe Room ID:", safeRoomId);
    console.log("2. Safe User ID:", safeUserId);
    console.log("3. Safe User Name:", safeUserName);
    console.log("=============================");

    const appID = parseInt(import.meta.env.VITE_ZEGO_APP_ID, 10);
    const serverSecret = import.meta.env.VITE_ZEGO_SERVER_SECRET;

    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
      appID, serverSecret, safeRoomId, safeUserId, safeUserName
    );

    if (!zpRef.current) {
        zpRef.current = ZegoUIKitPrebuilt.create(kitToken);
    }
    const zp = zpRef.current;

    zp.joinRoom({
      container: element,
      scenario: { mode: ZegoUIKitPrebuilt.VideoConference },
      showScreenSharingButton: true,
      
      onUserJoin: (users) => {
        // Safe check for participant count
        if (!participantCountRef.current) participantCountRef.current = 1;
        participantCountRef.current += users.length;
        console.log("User Joined. Max Count:", participantCountRef.current);
      },

      onLeaveRoom: async () => {
        if (isHost && mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop(); 
        } else {
            navigate('/dashboard');
        }
      },
    });
  }, [roomId, isHost, navigate, user?.fullName, user?.id]); 

  // ==========================================
  // --- RENDER BLOCK ---
  // ==========================================
  
  // 1. Show Uploading Screen
  if (isUploading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center vh-100 bg-light">
        <div className="spinner-border text-primary mb-3" role="status"></div>
        <h3>Uploading Meeting Data...</h3>
      </div>
    );
  }

  // 2. Show Waiting Room for Guests (Early Joiners)
  if (isWaitingForHost) {
    return (
      <div className="container d-flex flex-column justify-content-center align-items-center vh-100 bg-light">
        <div className="card text-center p-5 shadow-lg border-0 rounded-4" style={{maxWidth: '500px'}}>
          <div className="spinner-grow text-primary mb-4 mx-auto" style={{width: '3rem', height: '3rem'}} role="status"></div>
          <h2 className="fw-bold mb-3">Waiting for the Host</h2>
          <p className="text-muted fs-5">The meeting hasn't started yet. We will automatically let you in as soon as the host arrives.</p>
        </div>
      </div>
    );
  }

  // 3. Show Permission Screen for Host
  if (!joined && isHost) {
    return (
      <div className="container d-flex justify-content-center align-items-center vh-100">
        <div className="card text-center p-5 shadow-lg border-0" style={{maxWidth: '500px'}}>
          <h2 className="fw-bold mb-3">Ready to Start?</h2>
          <p>Please share screen + audio to enable AI features.</p>
          <button onClick={startRecordingAndJoin} className="btn btn-primary btn-lg rounded-pill w-100">
            Start Meeting
          </button>
        </div>
      </div>
    );
  }

  // 4. Show the Live ZegoCloud Room
  return (
    <div ref={myMeeting} style={{ width: '100vw', height: '100vh' }}></div>
  );
};

export default VideoRoom;