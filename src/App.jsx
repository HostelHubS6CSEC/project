import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import StudentDashboard from './components/StudentDashboard';
import WardenDashboard from './components/WardenDashboard';
import MessDashboard from './components/MessDashboard';
import SecurityDashboard from './components/SecurityDashboard';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-indigo-600 to-teal-500 min-h-screen flex items-center justify-center font-poppins">
        <p className="text-white text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <Router>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Login setUser={setUser} />} />
        <Route path="/student" element={user?.role === 'student' ? <StudentDashboard user={user} setUser={setUser} /> : <Navigate to="/" />} />
        <Route path="/warden" element={user?.role === 'warden' ? <WardenDashboard user={user} /> : <Navigate to="/" />} />
        <Route path="/mess" element={user?.role === 'mess' ? <MessDashboard user={user} /> : <Navigate to="/" />} />
        <Route path="/security" element={user?.role === 'security' ? <SecurityDashboard user={user} /> : <Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;