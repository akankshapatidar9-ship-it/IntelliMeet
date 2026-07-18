import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

function Signup() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: ''
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 1. Send data to Backend
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/auth/signup`, formData);
      
      console.log('Signup Success:', response.data);

      // 2. AUTO-LOGIN: Save the user data directly!
      localStorage.setItem('user', JSON.stringify(response.data));
      
      // 3. Go straight to Dashboard
      alert('Account Created! Redirecting to Dashboard...');
      navigate('/dashboard');

    } catch (error) {
      console.error('Error:', error);
      alert('Signup Failed! Email might already be taken.');
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="card shadow-lg p-4" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="card-body">
          <h2 className="text-center mb-4 text-primary">Join IntelliMeet</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                name="fullName"
                className="form-control"
                placeholder="User Name"
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                name="email"
                className="form-control"
                placeholder="name@example.com"
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-4">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                className="form-control"
                placeholder="******"
                onChange={handleChange}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-100 btn-lg">
              Sign Up & Login
            </button>
          </form>
          <div className="text-center mt-3">
            <p>Already have an account? <Link to="/login" className="text-decoration-none">Login here</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;