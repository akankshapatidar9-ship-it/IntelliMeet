import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

const LiveMeeting = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [isRecording, setIsRecording] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);

  // References to hold the media stream and recorded data
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  // --- TIMER LOGIC ---
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // --- RECORDING ENGINE ---
  const startRecording = async () => {
    try {
      // 1. Ask browser for microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setHasPermission(true);

      // 2. Initialize the Media Recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // 3. Collect audio data chunks as they are generated
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // 4. What happens when we hit stop?
      mediaRecorder.onstop = handleUpload;

      // 5. Start!
      mediaRecorder.start();
      setIsRecording(true);

    } catch (err) {
      console.error("Microphone access denied:", err);
      Swal.fire('Microphone Required', 'Please allow microphone access to record the meeting.', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); // This triggers the onstop event
      setIsRecording(false);
      
      // Turn off the microphone hardware light
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  // --- UPLOAD LOGIC ---
  const handleUpload = async () => {
    // 1. Combine all the little audio chunks into one massive Audio File (Blob)
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    
    // 2. Package it into a form to send to Spring Boot
    const formData = new FormData();
    formData.append("file", audioBlob, `meeting_${id}.webm`);

    // 3. Show Loading UI
    Swal.fire({
      title: 'Saving Meeting...',
      html: 'Uploading audio to the server.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      // 4. Send to our new Endpoint!
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/meetings/${id}/upload-live-audio`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      Swal.close();
      
      // 5. Instantly route them to the processing screen!
      navigate(`/meeting/${id}`);

    } catch (error) {
      console.error("Upload failed:", error);
      Swal.fire('Upload Failed', 'Could not save the meeting audio. Please check your connection.', 'error');
    }
  };

  return (
    <div className="d-flex bg-dark min-vh-100 align-items-center justify-content-center" style={{ backgroundImage: 'radial-gradient(circle at center, #2b3035 0%, #212529 100%)' }}>
      
      {/* Back Button */}
      <div className="position-absolute top-0 start-0 p-4">
         <button onClick={() => navigate(-1)} className="btn btn-link text-white text-decoration-none border-0" disabled={isRecording}>
            <i className="bi bi-arrow-left fs-4"></i>
         </button>
      </div>

      <div className="text-center">
        {/* Pulsing Recording Indicator */}
        <div className="position-relative d-inline-block mb-5">
            {isRecording && (
                <div className="position-absolute top-50 start-50 translate-middle rounded-circle bg-danger opacity-25" 
                     style={{ width: '250px', height: '250px', animation: 'pulse 1.5s infinite' }}>
                </div>
            )}
            <div className={`rounded-circle d-flex align-items-center justify-content-center position-relative shadow-lg ${isRecording ? 'bg-danger text-white' : 'bg-secondary text-white-50'}`} 
                 style={{ width: '150px', height: '150px', transition: 'all 0.3s' }}>
                <i className={`bi ${isRecording ? 'bi-mic-fill' : 'bi-mic-mute-fill'}`} style={{ fontSize: '4rem' }}></i>
            </div>
        </div>

        {/* Timer Display */}
        <h1 className="text-white fw-bold mb-4" style={{ fontSize: '4rem', fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(timeElapsed)}
        </h1>

        {/* Controls */}
        <div className="mt-4">
          {!isRecording ? (
            <button className="btn btn-primary btn-lg rounded-pill px-5 py-3 fw-bold fs-5 shadow" onClick={startRecording}>
              <i className="bi bi-play-circle-fill me-2"></i> Start Meeting
            </button>
          ) : (
            <button className="btn btn-danger btn-lg rounded-pill px-5 py-3 fw-bold fs-5 shadow" onClick={stopRecording}>
              <i className="bi bi-stop-circle-fill me-2"></i> End Meeting
            </button>
          )}
        </div>
        
        {isRecording && <p className="text-white-50 mt-4 small"><i className="bi bi-record-circle text-danger me-1"></i> Recording in progress. Do not close this tab.</p>}

      </div>

      {/* Internal CSS for the pulse animation */}
      <style>{`
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.5; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default LiveMeeting;