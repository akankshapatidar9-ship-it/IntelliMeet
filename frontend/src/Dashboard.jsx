import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2'; 
import Sidebar from './components/Sidebar';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState('upcoming'); // NEW: Tab State
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchMeetings(parsedUser.email);
    }
  }, []);

  const fetchMeetings = async (email) => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/meetings?email=${email}`);
      // Sort meetings: Newest first
      const sortedMeetings = response.data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setMeetings(sortedMeetings);
    } catch (error) {
      console.error("Error fetching meetings:", error);
    }
  };

  const handleViewTranscript = (transcript) => {
    Swal.fire({
      title: '<strong>Meeting Transcript</strong>',
      html: `
        <div style="text-align: left; max-height: 400px; overflow-y: auto; font-size: 14px; line-height: 1.6;">
          ${transcript ? transcript : "<i>No transcript text found.</i>"}
        </div>
      `,
      width: '700px',
      showCloseButton: true,
      focusConfirm: false,
      confirmButtonText: 'Close',
      confirmButtonColor: '#6c757d'
    });
  };

  // --- 1. SEARCH FILTER LOGIC ---
  const searchedMeetings = meetings.filter((meeting) => {
    const query = searchQuery.toLowerCase();
    const titleMatch = meeting.title && meeting.title.toLowerCase().includes(query);
    const summaryMatch = meeting.summary && meeting.summary.toLowerCase().includes(query);
    return titleMatch || summaryMatch;
  });

  // --- 2. SPLIT INTO TABS (Applying the search filter to both) ---
  const upcomingMeetings = searchedMeetings.filter(m => m.status === 'SCHEDULED');
  const pastMeetings = searchedMeetings.filter(m => m.status !== 'SCHEDULED');

  // --- 3. SAFE DASHBOARD STATS LOGIC ---
  const safeMeetings = meetings || []; 
  const totalMeetings = safeMeetings.length;
  const aiSummaries = safeMeetings.filter(m => m?.status?.toUpperCase() === 'COMPLETED').length;
  const processingOrLive = safeMeetings.filter(m => m?.status?.toUpperCase() !== 'COMPLETED' && m?.status?.toUpperCase() !== 'SCHEDULED').length;

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar user={user} />

      <div className="flex-grow-1 p-4" style={{ marginLeft: '250px' }}>
        
        {/* --- TOP HEADER & STATS ROW --- */}
        <div className="row align-items-center mb-5 mt-2">
          
          {/* Welcome Section */}
          <div className="col-lg-5 mb-4 mb-lg-0">
            <p className="text-muted mb-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <h2 className="fw-bold mb-1">Welcome back, {user ? user.fullName.split(' ')[0] : 'User'}! 👋</h2>
            <p className="text-muted">Here is what’s happening today.</p>
          </div>

          {/* Stats Section */}
          <div className="col-lg-7">
            <div className="row g-3">
              <div className="col-sm-4">
                <div className="card border-0 shadow-sm rounded-4 h-100 p-3 bg-white">
                  <div className="d-flex align-items-center mb-2">
                    <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '35px', height: '35px' }}>
                      <i className="bi bi-camera-video"></i>
                    </div>
                    <span className="text-muted fw-semibold" style={{ fontSize: '0.85rem' }}>Total Meetings</span>
                  </div>
                  <h3 className="fw-bold mb-0 ms-1">{totalMeetings}</h3>
                </div>
              </div>

              <div className="col-sm-4">
                <div className="card border-0 shadow-sm rounded-4 h-100 p-3 bg-white">
                  <div className="d-flex align-items-center mb-2">
                    <div className="bg-success bg-opacity-10 text-success rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '35px', height: '35px' }}>
                      <i className="bi bi-sparkles"></i>
                    </div>
                    <span className="text-muted fw-semibold" style={{ fontSize: '0.85rem' }}>AI Summaries</span>
                  </div>
                  <h3 className="fw-bold mb-0 ms-1">{aiSummaries}</h3>
                </div>
              </div>

              <div className="col-sm-4">
                <div className="card border-0 shadow-sm rounded-4 h-100 p-3 bg-white">
                  <div className="d-flex align-items-center mb-2">
                    <div className="bg-warning bg-opacity-10 text-warning rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '35px', height: '35px' }}>
                      <i className="bi bi-hourglass-split"></i>
                    </div>
                    <span className="text-muted fw-semibold" style={{ fontSize: '0.85rem' }}>Processing</span>
                  </div>
                  <h3 className="fw-bold mb-0 ms-1">{processingOrLive}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- STYLISH MEETINGS HEADER & SEARCH --- */}
        <div className="d-flex justify-content-between align-items-center mb-4 mt-5">
          <h4 className="fw-bold mb-0 text-dark">Your Meetings</h4>
          
          <div className="input-group shadow-sm rounded-pill overflow-hidden" style={{ maxWidth: '350px' }}>
            <span className="input-group-text bg-white border-0 pe-1">
              <i className="bi bi-search text-muted"></i>
            </span>
            <input
              type="text"
              className="form-control border-0 shadow-none ps-2"
              placeholder="Search meetings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontSize: '0.95rem' }}
            />
            {searchQuery && (
              <button className="btn bg-white border-0 text-muted pe-3" onClick={() => setSearchQuery("")}>
                <i className="bi bi-x-circle-fill"></i>
              </button>
            )}
          </div>
        </div>

        {/* --- TAB NAVIGATION --- */}
        <div className="d-flex border-bottom mb-4">
          <button 
            className={`btn pb-2 px-4 rounded-0 fw-bold ${activeTab === 'upcoming' ? 'border-bottom border-primary border-3 text-primary' : 'text-muted'}`}
            onClick={() => setActiveTab('upcoming')}
            style={{ transition: 'all 0.3s' }}
          >
            Upcoming <span className={`badge ms-2 ${activeTab === 'upcoming' ? 'bg-primary' : 'bg-secondary'}`}>{upcomingMeetings.length}</span>
          </button>
          <button 
            className={`btn pb-2 px-4 rounded-0 fw-bold ${activeTab === 'past' ? 'border-bottom border-primary border-3 text-primary' : 'text-muted'}`}
            onClick={() => setActiveTab('past')}
            style={{ transition: 'all 0.3s' }}
          >
            History <span className={`badge ms-2 ${activeTab === 'past' ? 'bg-primary' : 'bg-secondary'}`}>{pastMeetings.length}</span>
          </button>
        </div>
            
        {/* --- DYNAMIC LIST DISPLAY --- */}
        {meetings.length === 0 ? (
            <div className="alert alert-light text-center p-5 shadow-sm border-0 rounded-4">
                <h4 className="text-muted">No meetings found.</h4>
                <p>Click "New Meeting" to get started!</p>
            </div>
        ) : (
            <div className="row">
                
                {activeTab === 'upcoming' && (
                  upcomingMeetings.length > 0 ? (
                    upcomingMeetings.map(meeting => (
                      <div className="col-md-6 col-lg-4 mb-4" key={meeting.id}>
                        <div className="card shadow-sm border-0 rounded-4 h-100 bg-white" style={{ transition: 'transform 0.2s' }}>
                          <div className="card-body p-4">
                            <div className="d-flex justify-content-between align-items-start mb-3">
                              <div className="bg-primary bg-opacity-10 text-primary p-2 rounded-3">
                                <i className="bi bi-calendar-check fs-4"></i>
                              </div>
                              <span className="badge bg-info text-dark rounded-pill px-3 py-2">Scheduled</span>
                            </div>
                            <h5 className="fw-bold mb-2 text-truncate" title={meeting.title}>{meeting.title}</h5>
                            <p className="text-muted small mb-3">
                              <i className="bi bi-clock me-2"></i>
                              {new Date(meeting.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                            <div className="d-flex align-items-center mb-4">
                               <i className="bi bi-people me-2 text-muted"></i>
                               <span className="small text-muted">{meeting.participantsCount || ((meeting.participantEmails?.length || 0) + 1)} Participants</span>
                            </div>
                            <button className="btn btn-outline-primary w-100 rounded-pill fw-bold" onClick={() => navigate(`/meeting/${meeting.id}`)}>
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-12 text-center text-muted py-5">
                        <i className="bi bi-calendar-x display-4 mb-3 d-block text-black-50"></i>
                        <h5>No upcoming meetings {searchQuery && "matching your search"}.</h5>
                    </div>
                  )
                )}

                {activeTab === 'past' && (
                  pastMeetings.length > 0 ? (
                    pastMeetings.map((meeting) => (
                      <div className="col-md-4 mb-4" key={meeting.id}>
                          <div className="card border-0 shadow-sm h-100 rounded-4">
                              <div className="card-body p-4">
                                  <div className="d-flex justify-content-between mb-2">
                                      <h6 className="fw-bold mb-1 text-truncate" style={{maxWidth: '75%'}} title={meeting.title}>
                                          {meeting.status === 'COMPLETED' ? (
                                              <><span className="text-warning me-2">✨</span>{meeting.title}</>
                                          ) : (
                                              meeting.title
                                          )}
                                      </h6>
                                      <span className={`badge rounded-pill ${meeting.status === 'COMPLETED' ? 'bg-success' : 'bg-warning text-dark'}`}>
                                          {meeting.status}
                                      </span>
                                  </div>
                                  <p className="text-muted small mb-3">
                                      {new Date(meeting.date).toLocaleDateString()} • {new Date(meeting.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </p>
                                  
                                  <div className="d-flex align-items-center justify-content-between mt-3">
                                      <div className="small text-muted">
                                          <i className="bi bi-people-fill me-1"></i>
                                          {meeting.participantsCount || ((meeting.participantEmails ? meeting.participantEmails.length : 0) + 1)} 
                                      </div>
                                      <div>
                                          {(meeting.status?.toUpperCase() === 'COMPLETED' || meeting.status?.toUpperCase() === 'FAILED') && (
                                              <button 
                                                  className="btn btn-outline-success btn-sm rounded-pill px-3"
                                                  onClick={() => navigate(`/meeting/${meeting.id}`)}
                                              >
                                                  <i className="bi bi-file-text me-1"></i> Details
                                              </button>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-12 text-center text-muted py-5">
                        <i className="bi bi-search display-4 mb-3 d-block text-black-50"></i>
                        <h5>No historical meetings found {searchQuery && `matching "${searchQuery}"`}.</h5>
                    </div>
                  )
                )}

            </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;