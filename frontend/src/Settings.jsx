import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Swal from 'sweetalert2';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('preferences');
  const [user, setUser] = useState({ email: '' });
  
  // States for Security Tab
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

  // States for Preferences Tab
  const [preferences, setPreferences] = useState({
    cameraOffOnJoin: false,
    micMutedOnJoin: false,
    darkMode: false
  });

  useEffect(() => {
    // 1. Load User Email
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (storedUser) setUser(storedUser);

    // 2. Load Saved Preferences from LocalStorage
    const savedPrefs = JSON.parse(localStorage.getItem('intelliMeetPrefs'));
    if (savedPrefs) setPreferences(savedPrefs);
  }, []);

  const togglePreference = (key) => {
    const updatedPrefs = { ...preferences, [key]: !preferences[key] };
    setPreferences(updatedPrefs);
    // Save to LocalStorage instantly!
    localStorage.setItem('intelliMeetPrefs', JSON.stringify(updatedPrefs));
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      Swal.fire('Error', 'New passwords do not match!', 'error');
      return;
    }

    try {
      Swal.fire({ title: 'Updating...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

      // Hit our brand new Spring Boot endpoint
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/auth/change-password`, {
        email: user.email,
        currentPassword: passwords.current,
        newPassword: passwords.new
      });

      Swal.fire('Success', 'Your password has been updated securely.', 'success');
      setPasswords({ current: '', new: '', confirm: '' }); // Clear the form

    } catch (error) {
      const errorMsg = error.response?.data || 'Failed to update password.';
      Swal.fire('Error', errorMsg, 'error');
    }
  };

  return (
    <div className={`d-flex min-vh-100 ${preferences.darkMode ? 'bg-dark text-white' : 'bg-light'}`}>
      <Sidebar user={user} />
      
      <div className="flex-grow-1 p-4" style={{ marginLeft: '250px' }}>
        <Header />

        <div className="container-fluid mt-4 max-w-4xl">
          <h2 className="fw-bold mb-4">Settings</h2>

          <div className="row">
            {/* --- SETTINGS NAVIGATION SIDEBAR --- */}
            <div className="col-md-3 mb-4">
              <div className={`card border-0 shadow-sm rounded-4 overflow-hidden ${preferences.darkMode ? 'bg-secondary' : ''}`}>
                <div className="list-group list-group-flush">
                  <button 
                    className={`list-group-item list-group-item-action py-3 px-4 fw-semibold border-0 ${activeTab === 'preferences' ? 'active bg-primary text-white' : (preferences.darkMode ? 'bg-secondary text-light' : 'text-secondary')}`}
                    onClick={() => setActiveTab('preferences')}
                  >
                    <i className="bi bi-sliders me-2"></i> Preferences
                  </button>
                  <button 
                    className={`list-group-item list-group-item-action py-3 px-4 fw-semibold border-0 ${activeTab === 'security' ? 'active bg-primary text-white' : (preferences.darkMode ? 'bg-secondary text-light' : 'text-secondary')}`}
                    onClick={() => setActiveTab('security')}
                  >
                    <i className="bi bi-shield-lock me-2"></i> Security
                  </button>
                </div>
              </div>
            </div>

            {/* --- SETTINGS CONTENT AREA --- */}
            <div className="col-md-9">
              <div className={`card border-0 shadow-sm rounded-4 ${preferences.darkMode ? 'bg-secondary text-light' : ''}`}>
                <div className="card-body p-5">

                  {/* --- PREFERENCES TAB --- */}
                  {activeTab === 'preferences' && (
                    <div className="animate__animated animate__fadeIn">
                      <h4 className="fw-bold mb-4">Meeting Preferences</h4>
                      
                      <div className="list-group list-group-flush mb-4">
                        <div className={`list-group-item d-flex justify-content-between align-items-center py-3 px-0 border-bottom ${preferences.darkMode ? 'bg-secondary text-light' : ''}`}>
                          <div>
                            <h6 className="fw-bold mb-1">Join with Camera Off</h6>
                            <p className={`small mb-0 ${preferences.darkMode ? 'text-light opacity-75' : 'text-muted'}`}>Automatically turn off your camera when joining a new room.</p>
                          </div>
                          <div className="form-check form-switch fs-4">
                            <input className="form-check-input cursor-pointer" type="checkbox" role="switch" checked={preferences.cameraOffOnJoin} onChange={() => togglePreference('cameraOffOnJoin')} />
                          </div>
                        </div>

                        <div className={`list-group-item d-flex justify-content-between align-items-center py-3 px-0 border-bottom ${preferences.darkMode ? 'bg-secondary text-light' : ''}`}>
                          <div>
                            <h6 className="fw-bold mb-1">Join Muted</h6>
                            <p className={`small mb-0 ${preferences.darkMode ? 'text-light opacity-75' : 'text-muted'}`}>Automatically mute your microphone when joining a new room.</p>
                          </div>
                          <div className="form-check form-switch fs-4">
                            <input className="form-check-input cursor-pointer" type="checkbox" role="switch" checked={preferences.micMutedOnJoin} onChange={() => togglePreference('micMutedOnJoin')} />
                          </div>
                        </div>

                        <div className={`list-group-item d-flex justify-content-between align-items-center py-3 px-0 border-bottom ${preferences.darkMode ? 'bg-secondary text-light' : ''}`}>
                          <div>
                            <h6 className="fw-bold mb-1">Dark Mode Settings</h6>
                            <p className={`small mb-0 ${preferences.darkMode ? 'text-light opacity-75' : 'text-muted'}`}>Switch this settings page to a dark theme.</p>
                          </div>
                          <div className="form-check form-switch fs-4">
                            <input className="form-check-input cursor-pointer" type="checkbox" role="switch" checked={preferences.darkMode} onChange={() => togglePreference('darkMode')} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- SECURITY TAB --- */}
                  {activeTab === 'security' && (
                    <div className="animate__animated animate__fadeIn">
                      <h4 className="fw-bold mb-4">Update Password</h4>
                      
                      <form onSubmit={handlePasswordSave}>
                        <div className="mb-4">
                          <label className={`form-label fw-semibold ${preferences.darkMode ? 'text-light' : 'text-muted'}`}>Current Password</label>
                          <input 
                            type="password" 
                            className={`form-control form-control-lg ${preferences.darkMode ? 'bg-dark text-white border-secondary' : 'bg-light'}`}
                            placeholder="Enter current password"
                            value={passwords.current}
                            onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                            required
                          />
                        </div>
                        
                        <div className="row mb-4">
                          <div className="col-md-6">
                            <label className={`form-label fw-semibold ${preferences.darkMode ? 'text-light' : 'text-muted'}`}>New Password</label>
                            <input 
                              type="password" 
                              className={`form-control form-control-lg ${preferences.darkMode ? 'bg-dark text-white border-secondary' : 'bg-light'}`}
                              placeholder="New password"
                              value={passwords.new}
                              onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                              required
                            />
                          </div>
                          <div className="col-md-6">
                            <label className={`form-label fw-semibold ${preferences.darkMode ? 'text-light' : 'text-muted'}`}>Confirm New Password</label>
                            <input 
                              type="password" 
                              className={`form-control form-control-lg ${preferences.darkMode ? 'bg-dark text-white border-secondary' : 'bg-light'}`}
                              placeholder="Confirm new password"
                              value={passwords.confirm}
                              onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                              required
                            />
                          </div>
                        </div>

                        <hr className="my-4" />
                        <div className="text-end">
                          <button type="submit" className="btn btn-primary px-5 py-2 rounded-pill fw-bold">Update Password</button>
                        </div>
                      </form>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;