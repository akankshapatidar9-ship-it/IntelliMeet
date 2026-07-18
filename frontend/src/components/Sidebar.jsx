import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const Sidebar = ({ user }) => { 
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false); 

  // --- NEW: SIDEBAR PROFILE IMAGE STATE ---
  // We need state here too, because if they change the photo on the profile page, 
  // the sidebar needs to know immediately. We will check LocalStorage when the menu opens.
  const [sidebarPhoto, setSidebarPhoto] = useState(localStorage.getItem('profileImage'));

  useEffect(() => {
    // This is a little advanced, but we can listen for local storage changes. 
    // This ensures if you upload a new photo on the Profile page, the Sidebar updates instantly.
    const handleStorageChange = () => {
        setSidebarPhoto(localStorage.getItem('profileImage'));
    };
    window.addEventListener('storage', handleStorageChange);
    
    // Also update on local state changes when the menu opens
    if (showUserMenu) { handleStorageChange(); }

    return () => window.removeEventListener('storage', handleStorageChange);
  }, [showUserMenu]);

  // Helper to get initials (e.g. "Arnav Pal" -> "AP")
  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const handleLogout = () => {
    setShowUserMenu(false); // Close the menu first
    Swal.fire({
        title: 'Are you sure?',
        text: "You will be logged out of your session.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33', 
        cancelButtonColor: '#3085d6', 
        confirmButtonText: 'Yes, Logout',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            // NOTE: In the future when we add an actual photo database, 
            // you probably won't want to clear the photo on logout! 
            // But for local testing, we'll clear it.
            localStorage.clear(); 
            
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true
            });
            Toast.fire({ icon: 'success', title: 'Logged out successfully' });

            navigate('/login'); 
        }
    });
  };

  return (
    <div className="d-flex flex-column p-3 bg-white vh-100 border-end" style={{ width: '250px', position: 'fixed', left: 0, top: 0, zIndex: 1040 }}>
      {/* Logo */}
      <a href="/dashboard" className="d-flex align-items-center mb-4 mb-md-0 me-md-auto text-decoration-none">
        <span className="fs-4 fw-bold text-dark">IntelliMeet</span>
      </a>
      
      <hr />

      {/* NEW MEETING BUTTON */}
      <button 
        className="btn btn-primary w-100 mb-4 rounded-pill shadow-sm"
        onClick={() => navigate('/meeting/new')}
      >
        <i className="bi bi-camera-video-fill me-2"></i> New Meeting
      </button>

      {/* Navigation Links */}
      <ul className="nav nav-pills flex-column mb-auto">
        <li className="nav-item mb-2">
          <button onClick={() => { navigate('/dashboard');}} className="btn btn-sm text-start w-100 mb-1 px-3 py-2 text-dark rounded-3 sidebar-btn-hover border-0 bg-transparent">
            <i className="bi bi-person me-2 text-muted"></i> Home
          </button>
        </li>
        <li className="nav-item mb-2">
          <button onClick={() => { navigate('/schedule');}} className="btn btn-sm text-start w-100 mb-1 px-3 py-2 text-dark rounded-3 sidebar-btn-hover border-0 bg-transparent">
            <i className="bi bi-person me-2 text-muted"></i> Schedule Meeting
          </button>
        </li>
      </ul>

      {/* --- DYNAMIC USER PROFILE (DROPUP) --- */}
      <div className="mt-auto position-relative">
        
        {/* The Pop-up Menu Box */}
        {showUserMenu && (
          <div 
            className="card border-0 shadow position-absolute w-100 mb-2" 
            style={{ bottom: '100%', left: 0, zIndex: 1050, borderRadius: '12px' }}
          >
            <div className="card-body p-2">
              <button onClick={() => { navigate('/profile'); setShowUserMenu(false); }} className="btn btn-sm text-start w-100 mb-1 px-3 py-2 text-dark rounded-3 sidebar-btn-hover border-0 bg-transparent">
                <i className="bi bi-person me-2 text-muted"></i> My Profile
              </button>
              <button onClick={() => { navigate('/settings'); setShowUserMenu(false); }} className="btn btn-sm text-start w-100 mb-1 px-3 py-2 text-dark rounded-3 sidebar-btn-hover border-0 bg-transparent">
                <i className="bi bi-gear me-2 text-muted"></i> Settings
              </button>
              
              <hr className="my-2 border-secondary opacity-25" />
              
              <button
                onClick={handleLogout}
                className="btn btn-sm text-start w-100 px-3 py-2 text-danger fw-semibold rounded-3 sidebar-btn-hover border-0 bg-transparent"
              >
                <i className="bi bi-box-arrow-right me-2"></i> Logout
              </button>
            </div>
          </div>
        )}

        {/* --- The Clickable User Bar --- */}
        <div
          className="d-flex align-items-center p-2 text-dark text-decoration-none rounded-4"
          style={{ 
            cursor: 'pointer', 
            backgroundColor: showUserMenu ? '#f8f9fa' : 'transparent', 
            transition: 'background-color 0.2s ease' 
          }}
          onClick={() => setShowUserMenu(!showUserMenu)}
        >
          
          {/* --- NEW: Interactive Avatar Logic (Image or Initials) --- */}
          {sidebarPhoto ? (
                <img 
                    src={sidebarPhoto} 
                    alt="P" 
                    className="rounded-circle object-fit-cover me-3 shadow-sm"
                    style={{ width: '38px', height: '38px', border: '2px solid white' }}
                />
          ) : (
                <div 
                    className="bg-primary text-white rounded-circle d-flex justify-content-center align-items-center me-3 fw-bold shadow-sm" 
                    style={{ width: '38px', height: '38px', fontSize: '15px' }}
                >
                    {getInitials(user?.fullName)}
                </div>
          )}

          <div className="d-flex flex-column" style={{ lineHeight: '1.2' }}>
            <strong className="text-truncate" style={{ maxWidth: '130px', fontSize: '0.95rem' }}>
              {user?.fullName || 'User'}
            </strong>
          </div>
          <i 
            className={`bi bi-chevron-${showUserMenu ? 'down' : 'up'} ms-auto text-muted`} 
            style={{ fontSize: '12px', transition: 'transform 0.2s' }}
          ></i>
        </div>
      </div>

    </div>
  );
};

export default Sidebar;