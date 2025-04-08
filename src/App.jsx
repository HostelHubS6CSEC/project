import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import StudentDashboard from './components/StudentDashboard';
import WardenDashboard from './components/WardenDashboard';
import MessDashboard from './components/MessDashboard';
import SecurityDashboard from './components/SecurityDashboard';
import AdminDashboard from './components/AdminDashboard';
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
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <Routes>
        <Route path="/" element={<Login setUser={setUser} />} />
        <Route path="/student" element={<StudentDashboard user={user} setUser={setUser} />} />
        <Route path="/warden" element={<WardenDashboard user={user} />} />
        <Route path="/mess" element={<MessDashboard user={user} />} />
        <Route path="/security" element={<SecurityDashboard user={user} />} />
        <Route path="/admin" element={<AdminDashboard user={user} />} />
      </Routes>
    </Router>
  );
}

export default App;