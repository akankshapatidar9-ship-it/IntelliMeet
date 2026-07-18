import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const MeetingChoice = () => {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');

const handleCreate = async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    
    try {
      // 1. Ask Backend to create the meeting
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/meetings/start`, null, {
        params: {
            email: user.email,
            title: "Instant Meeting" // You can add an input for this later
        }
      });
      
      const newRoomId = response.data.roomId;
      
      // 2. Navigate to the room
      navigate(`/room/${newRoomId}`, { state: { isHost: true } });
      
    } catch (error) {
      console.error("Error starting meeting:", error);
      alert("Could not start meeting.");
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    // Get logged in user
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;

    if (joinCode.trim()) {
      try {
        // 1. Send RoomID AND Email to Backend
        if (user && user.email) {
            await axios.post(`${import.meta.env.VITE_BACKEND_URL}/meetings/join/${joinCode.trim()}`, null, {
                params: { email: user.email }
            });
        }
        
        // 2. Navigate
        navigate(`/room/${joinCode}`, { state: { isHost: false } });
      
      } catch (error) {
        console.error("Join Error:", error);
        // Navigate anyway (maybe they are a guest without login, but for dashboard they need login)
        navigate(`/room/${joinCode}`, { state: { isHost: false } });
      }
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="container">
        
        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="fw-bold text-primary">Get Started</h1>
          <p className="text-muted">Choose how you want to connect.</p>
        </div>

        <div className="row justify-content-center">
          
          {/* OPTION 1: CREATE MEETING */}
          <div className="col-md-5 mb-4">
            <div className="card h-100 shadow-lg border-0 text-center p-5">
              <div className="mb-4">
                <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>
                  <i className="bi bi-camera-video-fill"></i>
                </div>
              </div>
              <h3>New Meeting</h3>
              <p className="text-muted mb-4">Create a new meeting room and invite your team.</p>
              <button onClick={handleCreate} className="btn btn-primary btn-lg w-100 rounded-pill">
                Create Instant Meeting
              </button>
            </div>
          </div>

          {/* OPTION 2: JOIN MEETING */}
          <div className="col-md-5 mb-4">
            <div className="card h-100 shadow-lg border-0 text-center p-5">
              <div className="mb-4">
                <div className="bg-success bg-opacity-10 text-success rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>
                  <i className="bi bi-link-45deg"></i>
                </div>
              </div>
              <h3>Join Meeting</h3>
              <p className="text-muted mb-4">Enter a code to join an existing session.</p>
              
              <form onSubmit={handleJoin}>
                <div className="input-group mb-3">
                  <input 
                    type="text" 
                    className="form-control form-control-lg" 
                    placeholder="123-456" 
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-outline-success btn-lg w-100 rounded-pill">
                  Join Now
                </button>
              </form>
            </div>
          </div>

        </div>

        {/* Back Button */}
        <div className="text-center mt-4">
          <button onClick={() => navigate('/dashboard')} className="btn btn-link text-secondary text-decoration-none">
            <i className="bi bi-arrow-left me-2"></i> Back to Dashboard
          </button>
        </div>

      </div>
    </div>
  );
};

export default MeetingChoice;