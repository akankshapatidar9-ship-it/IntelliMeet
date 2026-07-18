import axios from 'axios';
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Swal from 'sweetalert2';
import { Camera, UploadSimple, XCircle, CheckCircle } from 'phosphor-react';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', email: '' });
  
  // --- NEW: PROFILE IMAGE STATE ---
  // If 'profileImage' exists in local storage, use it. Otherwise, null.
  const [profileImage, setProfileImage] = useState(localStorage.getItem('profileImage') || null);
  
  // Camera Modal States
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  // Refs for camera stream
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null); // Ref for file upload

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setFormData({
        fullName: parsedUser.fullName || '',
        email: parsedUser.email || ''
      });
    }
  }, []);

  // --- HELPER: LOGOUT logic (Needed for sidebar mapping) ---
  const handleLogout = () => {
      Swal.fire({
          title: 'Logout?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33', 
          confirmButtonText: 'Yes, Logout'
      }).then((result) => {
          if (result.isConfirmed) {
              localStorage.clear(); // Clear all user data including image
              window.location.href = '/login'; 
          }
      });
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  // --- NEW: HANDLE PROFILE PHOTO ACTIONS ---
  const handlePhotoClick = () => {
    Swal.fire({
        title: '<strong>Update Profile Photo</strong>',
        icon: 'info',
        html: `Select your method:`,
        showCancelButton: true,
        showDenyButton: profileImage ? true : false, // Show 'Remove' only if image exists
        confirmButtonText: `<i class="bi bi-upload me-1"></i> Upload File`,
        confirmButtonColor: '#0d6efd',
        denyButtonText: `<i class="bi bi-trash me-1"></i> Remove`,
        denyButtonColor: '#dc3545',
        cancelButtonText: `<i class="bi bi-camera me-1"></i> Use Camera`,
        cancelButtonColor: '#198754', // Green for camera
        focusConfirm: false,
        customClass: {
            cancelButton: 'order-3', // Moves camera button to far right
            confirmButton: 'order-2', 
            denyButton: 'order-1'  // Moves remove button to far left
        }
    }).then((result) => {
        if (result.isConfirmed) {
            // Option 1: Trigger Hidden File Input
            fileInputRef.current.click();
        } else if (result.isDenied) {
            // Option 2: Remove Photo (back to initials)
            localStorage.removeItem('profileImage');
            setProfileImage(null);
            showToast('success', 'Profile photo removed.');
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            // Option 3: Use Camera
            startCamera();
        }
    });
  };

  // --- CAMERA LOGIC ---
  const startCamera = async () => {
      setIsCameraActive(true);
      try {
          // Ask device for camera permission (video only)
          const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 400, height: 400 }, audio: false });
          // Link the stream to the <video> element
          videoRef.current.srcObject = stream;
          videoRef.current.play();
      } catch (err) {
          console.error("Camera access denied:", err);
          setIsCameraActive(false);
          Swal.fire('Error', 'Camera access was denied. Please check device permissions.', 'error');
      }
  };

  const stopCamera = () => {
      const stream = videoRef.current?.srcObject;
      const tracks = stream?.getTracks();
      if (tracks) {
          tracks.forEach(track => track.stop()); // Stop actual device camera
      }
      setIsCameraActive(false);
  };

  const capturePhoto = () => {
      const context = canvasRef.current.getContext('2d');
      // Draw the current video frame onto the canvas (at original resolution)
      context.drawImage(videoRef.current, 0, 0, 400, 400);
      
      // Convert canvas to a Base64 image string (jpeg for smaller size)
      const dataUrl = canvasRef.current.toDataUrl('image/jpeg');
      saveImage(dataUrl);
  };

  // --- FILE UPLOAD LOGIC ---
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            Swal.fire('Error', 'Invalid file type. Please select an image.', 'error');
            return;
        }

        const reader = new FileReader();
        // Convert file to Base64 string on successful load
        reader.onloadend = () => {
            const dataUrl = reader.result;
            saveImage(dataUrl);
        };
        reader.readAsDataURL(file); // Start reading
    }
  };

  // --- FINAL SAVE IMAGE (State + Local Storage) ---
  // --- FINAL SAVE IMAGE (State + Local Storage + Database) ---
  const saveImage = async (imageData) => {
    // 1. Instantly update the UI and Local Storage
    localStorage.setItem('profileImage', imageData); 
    setProfileImage(imageData); 
    stopCamera(); 
    
    // Show a quick loading state so the user knows it's saving to the server
    Swal.fire({ title: 'Saving photo...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        // 2. Send the new image to Spring Boot IMMEDIATELY
        const payload = {
            fullName: user.fullName, // Keep the existing name
            profileImage: imageData  // Send the brand new image string
        };

        const response = await axios.put(`${import.meta.env.VITE_BACKEND_URL}/auth/${user.id}/profile`, payload);

        // 3. Update the official user data
        localStorage.setItem('user', JSON.stringify(response.data));
        setUser(response.data);

        // 4. Success!
        Swal.fire({
            icon: 'success',
            title: 'Photo Saved!',
            text: 'Your new profile photo is secured in the database.',
            timer: 2000,
            showConfirmButton: false
        });

    } catch (error) {
        console.error("Failed to save photo to DB:", error);
        Swal.fire('Error', 'Photo updated on screen, but failed to save to database. The file might be too large.', 'error');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    // 1. Show a loading state
    Swal.fire({ title: 'Saving...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        // 2. Prepare the data payload
        const payload = {
            fullName: formData.fullName,
            profileImage: profileImage // Sends the current Base64 image state
        };

        // 3. Send it to Spring Boot!
        const response = await axios.put(`${import.meta.env.VITE_BACKEND_URL}/auth/${user.id}/profile`, payload);

        // 4. Update Local Storage with the official DB response
        const updatedUser = response.data; 
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // 5. Update UI
        setUser(updatedUser);
        setIsEditing(false);

        // 6. Show Success Toast
        Swal.fire({
            icon: 'success',
            title: 'Saved!',
            text: 'Your profile has been updated in the database.',
            timer: 2000,
            showConfirmButton: false
        });

    } catch (error) {
        console.error("Failed to update profile", error);
        Swal.fire('Error', 'Could not save to the database.', 'error');
    }
  };

  // Helper function for quick success toasts
  const showToast = (icon, title) => {
    Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
    }).fire({ icon, title });
  };

  if (!user) return null; 

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar user={user} />

      <div className="flex-grow-1 p-4" style={{ marginLeft: '250px' }}>
        
        {/* Header */}
        <div className="mb-4 mt-2">
          <h2 className="fw-bold mb-1">My Profile</h2>
          <p className="text-muted">Manage your personal information and profile photo.</p>
        </div>

        <div className="row">
          <div className="col-xl-8 col-lg-10">
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
              
              {/* Decorative Banner */}
              <div className="bg-primary bg-gradient" style={{ height: '120px', opacity: '0.9' }}></div>
              
              <div className="card-body px-5 pb-5 pt-0">
                {/* Overlapping Avatar Section */}
                <div className="d-flex justify-content-between align-items-end mb-4" style={{ marginTop: '-45px' }}>
                  
                  {/* --- NEW: Interactive Avatar --- */}
                  <div className="position-relative bg-white p-2 rounded-circle shadow-sm d-inline-block" style={{ cursor: 'pointer' }} onClick={handlePhotoClick}>
                    
                    {/* Render Initials OR Image */}
                    {profileImage ? (
                        <img 
                            src={profileImage} 
                            alt="Profile" 
                            className="rounded-circle object-fit-cover"
                            style={{ width: '90px', height: '90px' }}
                        />
                    ) : (
                        <div 
                          className="bg-primary bg-gradient text-white rounded-circle d-flex justify-content-center align-items-center fw-bold" 
                          style={{ width: '90px', height: '90px', fontSize: '2rem' }}
                        >
                          {getInitials(user.fullName)}
                        </div>
                    )}
                    
                    {/* Pencil Edit Icon overlay */}
                    <div className="position-absolute bottom-0 end-0 bg-white p-1 rounded-circle shadow">
                        <div className="bg-light rounded-circle d-flex align-items-center justify-content-center text-muted" style={{ width: '28px', height: '28px'}}>
                            <i className="bi bi-pencil-fill" style={{ fontSize: '12px' }}></i>
                        </div>
                    </div>
                  </div>
                  
                  <button 
                    className={`btn ${isEditing ? 'btn-outline-secondary' : 'btn-primary'} rounded-pill px-4`}
                    onClick={() => {
                        setIsEditing(!isEditing);
                        if (isEditing) setFormData({ fullName: user.fullName, email: user.email });
                    }}
                  >
                    {isEditing ? 'Cancel' : ( <><i className="bi bi-pencil-square me-2"></i> Edit Details</> )}
                  </button>
                </div>

                {/* Profile Form */}
                <form onSubmit={handleSave}>
                  {/* Hidden standard file input */}
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" style={{ display: 'none' }} />

                  <div className="row g-4">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold text-muted small text-uppercase">Full Name</label>
                      <input 
                        type="text" 
                        className="form-control form-control-lg bg-light border-0" 
                        value={formData.fullName}
                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                        disabled={!isEditing}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold text-muted small text-uppercase">Email Address</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-0 text-muted"><i className="bi bi-envelope"></i></span>
                        <input 
                          type="email" 
                          className="form-control form-control-lg bg-light border-0" 
                          value={formData.email}
                          disabled={true} 
                          title="Email cannot be changed"
                        />
                      </div>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-5 text-end">
                      <button type="submit" className="btn btn-success btn-lg rounded-pill px-5 shadow-sm">
                        <i className="bi bi-check2-circle me-2"></i> Save Changes
                      </button>
                    </div>
                  )}
                </form>

              </div>
            </div>
          </div>
        </div>

      </div>

      {/* --- NEW: CAMERA CAPTURE MODAL OVERLAY --- */}
      {isCameraActive && (
          <div className="position-fixed top-0 start-0 w-100 h-100 bg-black bg-opacity-75 d-flex justify-content-center align-items-center" style={{ zIndex: 2000 }}>
              <div className="card border-0 shadow-lg rounded-4 overflow-hidden" style={{ width: '400px' }}>
                  
                  {/* Video Stream */}
                  <div className="bg-dark position-relative" style={{ height: '400px' }}>
                    {/* The video element showing live camera stream */}
                    <video ref={videoRef} className="w-100 h-100 object-fit-cover" muted></video>
                    
                    {/* Simple overlay grid guide for better framing */}
                    <div className="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center">
                        <div className="rounded-circle border border-white border-4 border-opacity-50" style={{ width: '250px', height: '250px' }}></div>
                    </div>
                  </div>

                  {/* Hidden Canvas used for capturing the frame */}
                  <canvas ref={canvasRef} width="400" height="400" style={{ display: 'none' }}></canvas>

                  {/* Controls */}
                  <div className="card-body bg-light d-flex justify-content-between align-items-center p-3">
                      <button onClick={stopCamera} className="btn btn-sm btn-outline-danger rounded-pill px-3">
                          <XCircle className="me-1" size={18} /> Cancel
                      </button>
                      <button onClick={capturePhoto} className="btn btn-success btn-lg rounded-circle shadow p-3">
                          <Camera weight="bold" size={24} />
                      </button>
                      <div style={{ width: '80px' }}></div> {/* Spacer for balance */}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default Profile;