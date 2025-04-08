import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";
import Login from "./components/Login";
import Signup from "./components/Signup";
import StudentDashboard from "./components/StudentDashboard";
import WardenDashboard from "./components/WardenDashboard";
import MessDashboard from "./components/MessDashboard";
import SecurityDashboard from "./components/SecurityDashboard";

const PrivateRoute = ({ children, role }) => {
  const { user } = useContext(AuthContext);
  return user && user.role === role ? children : <Navigate to="/" />;
};

const App = () => {
  return (
    <AuthContext.Provider value={useContext(AuthContext)}>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={<PrivateRoute role="student"><StudentDashboard /></PrivateRoute>}
          />
          <Route
            path="/warden"
            element={<PrivateRoute role="warden"><WardenDashboard /></PrivateRoute>}
          />
          <Route
            path="/mess"
            element={<PrivateRoute role="mess"><MessDashboard /></PrivateRoute>}
          />
          <Route
            path="/security"
            element={<PrivateRoute role="security"><SecurityDashboard /></PrivateRoute>}
          />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
};

export default App;