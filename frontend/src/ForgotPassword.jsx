import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

const ForgotPassword = () => {
  const navigate = useNavigate();
  
  // State to track which step the user is on (1 = Email, 2 = OTP + New Password)
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form Data
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Step 1: Request OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/auth/forgot-password`, { email });
      
      Swal.fire({
        icon: 'success',
        title: 'OTP Sent!',
        text: 'Please check your email for the 6-digit code.',
        confirmButtonColor: '#0d6efd'
      });
      setStep(2); // Move to the next UI screen

    } catch (error) {
      Swal.fire('Error', 'Failed to send OTP. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Submit OTP & New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/auth/reset-password`, {
        email,
        otp,
        newPassword
      });

      Swal.fire({
        icon: 'success',
        title: 'Password Reset!',
        text: response.data,
        confirmButtonColor: '#0d6efd'
      }).then(() => {
        // Kick them back to the login page!
        navigate('/login');
      });

    } catch (error) {
      const errorMsg = error.response?.data || 'Invalid or expired OTP.';
      Swal.fire('Reset Failed', errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="d-flex min-vh-100 align-items-center justify-content-center bg-light">
      <div className="card shadow-sm p-4" style={{ width: '100%', maxWidth: '400px' }}>
        
        <div className="text-center mb-4">
          <i className="bi bi-shield-lock-fill text-primary" style={{ fontSize: '3rem' }}></i>
          <h2 className="fw-bold mt-2">Reset Password</h2>
          <p className="text-muted">
            {step === 1 ? "Enter your email to receive a secure code." : "Enter the code sent to your email."}
          </p>
        </div>

        {/* --- VIEW 1: EMAIL INPUT --- */}
        {step === 1 && (
          <form onSubmit={handleSendOtp}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Email Address</label>
              <input 
                type="email" 
                className="form-control form-control-lg" 
                placeholder="name@example.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg w-100 fw-bold" disabled={isLoading}>
              {isLoading ? <span className="spinner-border spinner-border-sm me-2"></span> : null}
              Send Verification Code
            </button>
          </form>
        )}

        {/* --- VIEW 2: OTP & PASSWORD INPUT --- */}
        {step === 2 && (
          <form onSubmit={handleResetPassword}>
            <div className="mb-3">
              <label className="form-label fw-semibold">6-Digit OTP</label>
              <input 
                type="text" 
                className="form-control form-control-lg text-center tracking-widest fs-4" 
                placeholder="------" 
                maxLength="6"
                value={otp} 
                onChange={(e) => setOtp(e.target.value)} 
                required 
              />
            </div>
            <div className="mb-4">
              <label className="form-label fw-semibold">New Password</label>
              <input 
                type="password" 
                className="form-control form-control-lg" 
                placeholder="Create a new password" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                required 
              />
            </div>
            <button type="submit" className="btn btn-success btn-lg w-100 fw-bold" disabled={isLoading}>
              {isLoading ? <span className="spinner-border spinner-border-sm me-2"></span> : null}
              Confirm & Reset
            </button>
          </form>
        )}

        {/* Back to Login Link */}
        <div className="text-center mt-4">
          <button className="btn btn-link text-decoration-none text-muted" onClick={() => navigate('/login')}>
            <i className="bi bi-arrow-left me-1"></i> Back to Login
          </button>
        </div>

      </div>
    </div>
  );
};

export default ForgotPassword;