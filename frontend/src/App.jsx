import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Signup from './Signup';
import Login from './Login';
import ForgotPassword from './ForgotPassword';
import Dashboard from './Dashboard';
import MeetingChoice from './MeetingChoice';
import VideoRoom from './VideoRoom';
import MeetingDetails from './MeetingDetails';
import Profile from './Profile';
import ScheduleMeeting from './ScheduleMeeting';
import LiveMeeting from './LiveMeeting';
import Settings from './Settings';

function App() {
  return (
    <Router>
      <Routes>
        {/* The Signup Page */}
        <Route path="/" element={<Signup />} />
        {/* The Login Page */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        {/* The Dashboard Page */}
        <Route path="/dashboard" element={<Dashboard />} />
        {/* Meeting Choice: Create or Join Meeting*/}
        <Route path="/meeting/new" element={<MeetingChoice />} />
        {/* Video Room */}
        <Route path="/room/:roomId" element={<VideoRoom />} />
        {/*Transcript Details */}
        <Route path="/meeting/:id" element={<MeetingDetails />} />
        {/* Live Meeting */}
        <Route path="/live/:id" element={<LiveMeeting />} />
        {/* The Profile Page */}
        <Route path="/profile" element={<Profile />} />
        {/* The Schedule Meeting Page */}
        <Route path="/schedule" element={<ScheduleMeeting />} />
        {/* The Setting Page */}
        <Route path="/settings" element={<Settings />} />

      </Routes>
    </Router>
  );
}

export default App;