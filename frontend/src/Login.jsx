import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("1. Submit button clicked"); // Debug Step 1

    try {
      console.log("2. Sending data to backend...", formData); // Debug Step 2
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/auth/login`, formData);
      
      console.log("3. Backend replied!", response.data); // Debug Step 3
      
      localStorage.setItem('user', JSON.stringify(response.data));
      console.log("4. User saved to storage"); // Debug Step 4
      

      // Inside your Login successful response:
      localStorage.setItem('user', JSON.stringify(response.data));

      // ALSO set the profile image so the Sidebar can see it immediately!
      if (response.data.profileImage) {
          localStorage.setItem('profileImage', response.data.profileImage);
      } else {
          localStorage.removeItem('profileImage');
      }

      console.log("5. Navigating to dashboard now..."); // Debug Step 5
      navigate('/dashboard');
      
    } catch (error) {
      console.error("Login Error:", error);
      
      // Get the specific message sent from Backend
      // If backend sends raw string, it is in error.response.data
      const errorMessage = error.response?.data || "Something went wrong. Please try again.";

      Swal.fire({
        title: 'Login Failed',
        text: errorMessage, // <--- This will now say "Wrong Password!" or "User not found!"
        icon: 'error',
        confirmButtonColor: '#d33'
      });
    }
  };

  // ... (The rest of the UI code is the same) ...
  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="card shadow-lg p-4" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="card-body">
          <h2 className="text-center mb-4 text-success">Welcome Back</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Email Address</label>
              <input type="email" name="email" className="form-control" placeholder="name@example.com" onChange={handleChange} required />
            </div>
            <div className="mb-4">
              <label className="form-label">Password</label>
              <input type="password" name="password" className="form-control" placeholder="******" onChange={handleChange} required />
            </div>
            <div className="text-end mb-3">
              <Link to="/forgot-password" className="text-decoration-none small">Forgot Password?</Link>
            </div>
            <button type="submit" className="btn btn-success w-100 btn-lg">Login</button>
          </form>
          <div className="text-center mt-3">
            <p>New to IntelliMeet? <Link to="/" className="text-decoration-none">Create an account</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;