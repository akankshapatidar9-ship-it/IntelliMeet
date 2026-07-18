import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Swal from 'sweetalert2';

// --- 1. INTERNAL ANIMATION COMPONENT ---
const ProcessingAnimation = () => {
  const [text, setText] = useState("🎧 Extracting audio...");
  
  useEffect(() => {
    const messages = [
      "🎧 Extracting audio from meeting...",
      "🧠 AI is listening to the conversation...",
      "🗣️ Identifying different speakers...",
      "📝 Generating transcript text...",
      "✨ Creating smart summary..."
    ];
    let i = 0;
    const timer = setInterval(() => {
      i = (i + 1) % messages.length;
      setText(messages[i]);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-center py-5">
      <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}></div>
      <h4 className="fw-bold animate-pulse">{text}</h4>
      <p className="text-muted">This usually takes about 30-60 seconds.</p>
      <style>{`
        .animate-pulse { animation: pulse 1.5s infinite; }
        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

// --- NEW: CUSTOM AUDIO PLAYER COMPONENT ---
const CustomAudioPlayer = ({ audioUrl }) => {
  const audioRef = React.useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current.duration);
  };

  const handleSeek = (e) => {
    const time = e.target.value;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="card shadow-sm border-0 mb-4 rounded-4 bg-white">
      <div className="card-body p-4 d-flex align-items-center">
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)} 
          preload="metadata"
        />
        <button
          onClick={togglePlay}
          className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center me-4 shadow-sm"
          style={{ width: '55px', height: '55px', flexShrink: 0 }}
        >
          <i className={`bi bi-${isPlaying ? 'pause-fill' : 'play-fill'} fs-3`}></i>
        </button>
        <div className="flex-grow-1">
          <div className="d-flex justify-content-between align-items-end mb-1">
            <h6 className="fw-bold mb-0 text-dark">Meeting Recording</h6>
            <span className="text-muted small fw-semibold" style={{ fontFamily: 'monospace', fontSize: '13px' }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <input
            type="range"
            className="form-range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            style={{ height: '6px' }}
          />
        </div>
      </div>
    </div>
  );
};

// --- 2. MAIN PAGE COMPONENT ---
const MeetingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // New State for the Launch Button
  const [isLaunching, setIsLaunching] = useState(false);
  
  const [speakerMap, setSpeakerMap] = useState({});
  const user = JSON.parse(localStorage.getItem('user')) || {};

  const fetchMeeting = useCallback(async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/meetings/${id}`);
      const data = response.data;
      setMeeting(data);
      setLoading(false);
      return data;
    } catch (error) {
      console.error("Error fetching meeting:", error);
      setLoading(false);
      return null;
    }
  }, [id]);

  useEffect(() => {
    let timeoutId;
    let isCancelled = false;

    const poll = async () => {
      const data = await fetchMeeting();
      if (!isCancelled && data && data.status === 'PROCESSING') {
        timeoutId = setTimeout(poll, 5000); 
      }
    };
    poll();

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [fetchMeeting]); 

  const uniqueSpeakers = meeting?.transcript 
    ? [...new Set(meeting.transcript.match(/Speaker [A-Z]/g) || [])].sort() 
    : [];

  const availableParticipants = [
    ...(meeting?.participantNames || []) 
  ].filter(Boolean);
  const uniqueParticipants = [...new Set(availableParticipants)]; 

  const handleSpeakerMapping = (speakerLabel, participantName) => {
    setSpeakerMap(prev => ({ ...prev, [speakerLabel]: participantName }));
  };

  const getDisplayTranscript = () => {
    let text = meeting?.transcript || "No transcript text available.";
    Object.entries(speakerMap).forEach(([label, name]) => {
      if (name) {
        const regex = new RegExp(label, 'g'); 
        text = text.replace(regex, `**${name}**`); 
      }
    });
    return text;
  };

  const handleRetryAI = async () => {
    Swal.fire({
      title: 'Waking up AI...',
      html: 'Sending your transcript back to Gemini.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/meetings/${meeting.id}/retry-ai`);
      
      Swal.fire({
        icon: 'success',
        title: 'AI Processing Started!',
        text: 'Generating your smart summary now...',
        timer: 2000,
        showConfirmButton: false
      });

      const updatedData = await fetchMeeting();
      if (updatedData && updatedData.status === 'PROCESSING') {
        const checkAgain = async () => {
          const checkData = await fetchMeeting();
          if (checkData && checkData.status === 'PROCESSING') {
            setTimeout(checkAgain, 5000);
          }
        };
        setTimeout(checkAgain, 5000);
      }
    } catch (error) {
      console.error("Retry failed:", error);
      Swal.fire('Error', 'Failed to trigger AI retry. Check your backend logs.', 'error');
    }
  };

  // NEW: Launch Meeting Logic
  const handleLaunchMeeting = async () => {
    setIsLaunching(true);
    try {
      // 1. Hit the backend to send emails and get the secure room code
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/meetings/${meeting.id}/launch?hostEmail=${user.email}`);
      
      const roomCode = response.data.roomCode;
      
      // 2. Redirect the host into the live video room
      navigate(`/room/${roomCode}`, { state: { isHost: true } });
      
    } catch (error) {
      console.error("Launch failed:", error);
      Swal.fire('Launch Failed', 'Could not launch the meeting. Make sure you are the host.', 'error');
    } finally {
      setIsLaunching(false);
    }
  };

  if (loading) return <div className="d-flex justify-content-center mt-5"><div className="spinner-border text-primary"></div></div>;
  if (!meeting) return <div className="text-center mt-5">Meeting not found</div>;

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar user={user} />
      
      <div className="flex-grow-1 p-4" style={{ marginLeft: '250px' }}>
        <Header />

        <button onClick={() => navigate('/dashboard')} className="btn btn-link text-decoration-none mb-3 pl-0">
          <i className="bi bi-arrow-left"></i> Back to Dashboard
        </button>

        {/* --- HEADER CARD --- */}
        <div className="card shadow-sm border-0 mb-4 rounded-4">
          <div className="card-body p-4 d-flex justify-content-between align-items-center">
            <div>
                <h2 className="fw-bold mb-2 text-dark">
                  {meeting.status === 'COMPLETED' && <span className="text-warning me-2">✨</span>}
                  {meeting.title}
                </h2>
                
                <div className="text-muted small">
                  <i className="bi bi-calendar-event me-2"></i>
                  {new Date(meeting.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>
            
            <span className={`badge rounded-pill px-4 py-2 fs-6 shadow-sm ${
              meeting.status === 'COMPLETED' ? 'bg-success text-white' : 
              meeting.status === 'SCHEDULED' ? 'bg-info text-dark' : 
              'bg-warning text-dark'
            }`}>
                {meeting.status}
            </span>
          </div>
        </div>

        {/* --- DYNAMIC CONTENT SWITCHER --- */}
        {meeting.status === 'PROCESSING' ? (
            <div className="card shadow-sm border-0 p-5 rounded-4">
                <ProcessingAnimation />
            </div>
        ) : meeting.status === 'SCHEDULED' ? (
            
            // --- UPDATED: SCHEDULED MEETING VIEW ---
            <div className="card shadow-sm border-0 p-5 text-center rounded-4 mt-4">
              <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4" style={{ width: '80px', height: '80px' }}>
                <i className="bi bi-camera-video fs-1"></i>
              </div>
              <h3 className="fw-bold text-dark">Ready to Start?</h3>
              <p className="text-muted mb-4 fs-5">This meeting is scheduled for <strong>{new Date(meeting.date).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })}</strong>.</p>
              
              <div className="d-flex justify-content-center gap-3">
                
                {/* HOST VIEW: Show Launch and Edit Buttons */}
                {(user?.email === meeting?.hostEmail || user?.email === meeting?.user?.email) ? (
                  <>
                    <button 
                      className="btn btn-primary btn-lg rounded-pill px-5 fw-bold shadow-sm" 
                      onClick={handleLaunchMeeting}
                      disabled={isLaunching}
                    >
                      {isLaunching ? (
                        <><span className="spinner-border spinner-border-sm me-2"></span>Sending Invites...</>
                      ) : (
                        <><i className="bi bi-mic-fill me-2"></i> Launch Live Meeting</>
                      )}
                    </button>
                    <button className="btn btn-outline-secondary btn-lg rounded-pill px-4" onClick={() => navigate('/schedule')}>
                      <i className="bi bi-pencil me-2"></i> Edit Details
                    </button>
                  </>
                ) : (
                  
                  //PARTICIPANT VIEW: Show Waiting Animation
                  <div className="alert alert-info rounded-pill px-5 mb-0 d-flex align-items-center fw-semibold">
                    <div className="spinner-grow spinner-grow-sm me-3 text-info" role="status"></div>
                    Waiting for the host to launch the meeting...
                  </div>

                )}

              </div>
            </div>

        ) : (
            // --- EXISTING: COMPLETED / FAILED VIEW ---
            <div className="row">
                <div className="col-lg-8">

                  {(meeting.status === 'COMPLETED' || meeting.status === 'FAILED') && meeting.audioFilePath && (
                        <CustomAudioPlayer audioUrl={`${import.meta.env.VITE_BACKEND_URL}/meetings/${meeting.id}/audio`} />
                    )}
                    
                    {/* --- SPEAKER MAPPING PANEL --- */}
                    {uniqueSpeakers.length > 0 && (
                      <div className="card shadow-sm border-0 mb-4 rounded-4 bg-primary bg-opacity-10">
                        <div className="card-body p-4">
                          <h6 className="fw-bold mb-3 fs-6 text-primary">
                            <i className="bi bi-people-fill me-2"></i> 
                            Identify Speakers
                          </h6>
                          <div className="row g-3">
                            {uniqueSpeakers.map(speaker => (
                              <div className="col-md-4" key={speaker}>
                                <label className="form-label small text-muted mb-1 fw-semibold">{speaker}</label>
                                <select
                                  className="form-select border-0 shadow-sm rounded-3"
                                  value={speakerMap[speaker] || ""}
                                  onChange={(e) => handleSpeakerMapping(speaker, e.target.value)}
                                >
                                  <option value="">Select participant...</option>
                                  {uniqueParticipants
                                    .filter(name => !Object.values(speakerMap).includes(name) || speakerMap[speaker] === name)
                                    .map(name => (
                                      <option key={name} value={name}>{name}</option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* --- TRANSCRIPT CARD --- */}
                    <div className="card shadow-sm border-0 rounded-4 mb-4" style={{ minHeight: '500px' }}>
                        <div className="card-header bg-white py-3 border-bottom-0 pt-4 px-4">
                            <h5 className="mb-0 fw-bold"><i className="bi bi-file-text text-primary me-2"></i>Transcript</h5>
                        </div>
                        <div className="card-body p-4 pt-2">
                            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', color: '#495057', fontSize: '1.05rem' }}>
                                {getDisplayTranscript().split('\n').map((line, i) => {
                                    if (line.includes('**')) {
                                        const parts = line.split('**');
                                        return (
                                            <span key={i}>
                                                {parts.map((part, index) => 
                                                    index % 2 === 1 ? <strong key={index} className="text-primary">{part}</strong> : part
                                                )}
                                                <br />
                                            </span>
                                        );
                                    }
                                    return <span key={i}>{line}<br /></span>;
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- SIDEBAR PANEL (Summary & Controls) --- */}
                <div className="col-lg-4">
                    <div className="card shadow-sm border-0 mb-4 rounded-4 position-sticky" style={{ top: '20px' }}>
                        <div className="card-header bg-white fw-bold py-3 pt-4 px-4 border-bottom-0">
                            <h5 className="mb-0 fw-bold">
                                <span className="text-warning me-2">✨</span> AI Summary
                            </h5>
                        </div>
                        <div className="card-body px-4 pb-4">
                            {meeting.summary ? (
                               <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem', lineHeight: '1.7', color: '#495057' }}>
                                  {meeting.summary}
                               </div>
                            ) : (
                               <div className="text-center py-4">
                                   <div className="alert alert-light text-muted small border-0 mb-4 rounded-4">
                                       <i className="bi bi-exclamation-triangle text-warning fs-4 d-block mb-2"></i>
                                       Summary unavailable. The AI may have encountered a quota limit or timeout.
                                   </div>
                                   
                                   <button 
                                      className="btn btn-warning rounded-pill px-4 fw-semibold shadow-sm text-dark"
                                      onClick={handleRetryAI}
                                   >
                                      <i className="bi bi-arrow-clockwise me-2"></i> Retry AI Summary
                                   </button>
                               </div>
                            )}
                            
                            <hr className="my-4" />

                            <button className="btn btn-outline-primary w-100 rounded-pill fw-semibold py-2" onClick={() => window.print()}>
                                <i className="bi bi-printer me-2"></i> Print Details
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default MeetingDetails;