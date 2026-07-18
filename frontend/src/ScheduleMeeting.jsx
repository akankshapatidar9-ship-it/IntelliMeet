import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

const ScheduleMeeting = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user')) || {};

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [emails, setEmails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSchedule = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Convert comma-separated emails into an array
    const emailArray = emails.split(',').map(e => e.trim()).filter(e => e.length > 0);

    const payload = {
      title: title,
      date: date, // HTML datetime-local input matches Java's LocalDateTime perfectly!
      hostEmail: user.email,
      participantEmails: emailArray
    };

    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/meetings/schedule`, payload);
      
      Swal.fire({
        icon: 'success',
        title: 'Meeting Scheduled!',
        text: 'It will now appear on your dashboard.',
        timer: 2000,
        showConfirmButton: false
      });
      
      navigate('/dashboard'); // Send them back to see it!
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'Failed to schedule meeting. Try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar user={user} />
      
      <div className="flex-grow-1 p-4" style={{ marginLeft: '250px' }}>
        <Header />
        
        <button onClick={() => navigate('/dashboard')} className="btn btn-link text-decoration-none mb-3 pl-0">
          <i className="bi bi-arrow-left"></i> Back to Dashboard
        </button>

        <div className="card shadow-sm border-0 rounded-4 mx-auto" style={{ maxWidth: '600px' }}>
          <div className="card-header bg-white py-4 border-bottom-0">
            <h4 className="fw-bold mb-0 text-dark"><i className="bi bi-calendar-plus text-primary me-2"></i>Schedule a Meeting</h4>
          </div>
          
          <div className="card-body p-4 pt-0">
            <form onSubmit={handleSchedule}>
              
              <div className="mb-4">
                <label className="form-label fw-semibold">Meeting Title</label>
                <input 
                  type="text" 
                  className="form-control form-control-lg bg-light border-0" 
                  placeholder="e.g., Weekly Sync" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  required 
                />
              </div>

              <div className="mb-4">
                <label className="form-label fw-semibold">Date & Time</label>
                <input 
                  type="datetime-local" 
                  className="form-control form-control-lg bg-light border-0" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                  required 
                />
              </div>

              <div className="mb-4">
                <label className="form-label fw-semibold">Invite Participants (Optional)</label>
                <input 
                  type="text" 
                  className="form-control form-control-lg bg-light border-0" 
                  placeholder="email1@test.com, email2@test.com" 
                  value={emails} 
                  onChange={(e) => setEmails(e.target.value)} 
                />
                <div className="form-text mt-2 text-muted">Separate multiple emails with commas.</div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary btn-lg w-100 rounded-pill fw-bold shadow-sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Scheduling...' : 'Confirm Meeting'}
              </button>
              
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleMeeting;