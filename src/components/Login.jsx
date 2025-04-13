// src/components/Login.jsx
import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import bcrypt from 'bcryptjs';

function Login({ setUser }) {
  const [rollNo, setRollNo] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [signupData, setSignupData] = useState({
    semester: '',
    name: '',
    branch: '',
    phone: '',
    room_requirements: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const setRollNoContext = async (rollNo) => {
    await supabase.rpc('set_current_roll_no', { roll_no: rollNo });
  };

  const login = async () => {
    try {
      setLoading(true);
      if (!rollNo || !password) {
        toast.error('Please enter both roll number and password');
        return;
      }

      await setRollNoContext(rollNo.trim());
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('roll_no', rollNo.trim())
        .single();

      if (error || !user) {
        console.error('Supabase error:', error);
        toast.error('Invalid roll number');
        return;
      }

      const passwordMatches = await bcrypt.compare(password, user.password);
      if (!passwordMatches) {
        toast.error('Invalid password');
        return;
      }

      toast.success('Login successful!');
      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
      navigate(`/${user.role}`);
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const signup = async () => {
    try {
      setLoading(true);
      // Validation
      if (!rollNo || !password || !signupData.name || !signupData.semester) {
        toast.error('Please fill all required fields');
        return;
      }

      // Semester: Single digit (1-8)
      if (!/^\d{1}$/.test(signupData.semester)) {
        toast.error('Semester must be a single digit (1-8)');
        return;
      }

      // Phone: Exactly 10 digits
      if (!/^\d{10}$/.test(signupData.phone)) {
        toast.error('Phone number must be exactly 10 digits');
        return;
      }

      // Password: Minimum 8 characters
      if (password.length < 8) {
        toast.error('Password must be at least 8 characters long');
        return;
      }

      const { data: existingUser } = await supabase
        .from('users')
        .select('roll_no')
        .eq('roll_no', rollNo)
        .single();
      if (existingUser) {
        throw new Error('Roll number already exists');
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const { error: insertError } = await supabase
        .from('users')
        .insert([{
          roll_no: rollNo,
          password: hashedPassword,
          semester: signupData.semester,
          role: 'student',
          name: signupData.name,
          branch: signupData.branch,
          phone: signupData.phone,
          room_no: signupData.room_requirements || null, // Store as room_no in DB
          mess_bill: 0,
          status: 'pending',
          profile_pic: 'https://via.placeholder.com/100?text=User' // Default profile pic
        }]);

      if (insertError) throw insertError;

      toast.success('Registration successful, awaiting admin approval');
      setIsSignup(false);
      setRollNo('');
      setPassword('');
      setSignupData({ semester: '', name: '', branch: '', phone: '', room_requirements: '' });
    } catch (error) {
      toast.error(`Signup failed: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-teal-500 min-h-screen flex items-center justify-center font-poppins">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-500 hover:scale-105">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6 animate-fade-in">
          <i className="fas fa-home mr-2 text-indigo-600"></i> HostelHub
        </h1>
        {isSignup ? (
          <>
            <input
              className="w-full p-3 border rounded-lg mb-4 text-gray-700"
              placeholder="Roll No"
              value={rollNo}
              onChange={e => setRollNo(e.target.value)}
            />
            <input
              className="w-full p-3 border rounded-lg mb-4 text-gray-700"
              placeholder="Name"
              value={signupData.name}
              onChange={e => setSignupData({ ...signupData, name: e.target.value })}
            />
            <input
              className="w-full p-3 border rounded-lg mb-4 text-gray-700"
              placeholder="Semester (1-8)"
              value={signupData.semester}
              onChange={e => setSignupData({ ...signupData, semester: e.target.value.replace(/\D/g, '')})}
              maxLength={1}
            />
            <input
              className="w-full p-3 border rounded-lg mb-4 text-gray-700"
              placeholder="Branch"
              value={signupData.branch}
              onChange={e => setSignupData({ ...signupData, branch: e.target.value})}
            />
            <input
              className="w-full p-3 border rounded-lg mb-4 text-gray-700"
              placeholder="Phone (10 digits)"
              value={signupData.phone}
              onChange={e => setSignupData({ ...signupData, phone: e.target.value.replace(/\D/g, '') })}
              maxLength={10}
            />
            <input
              className="w-full p-3 border rounded-lg mb-4 text-gray-700"
              placeholder="Room Requirements (if any)"
              value={signupData.room_requirements}
              onChange={e => setSignupData({ ...signupData, room_requirements: e.target.value })}
            />
            <input
              type="password"
              className="w-full p-3 border rounded-lg mb-4 text-gray-700"
              placeholder="Password (min 8 characters)"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              onClick={signup}
              className="w-full bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition duration-300"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Register'}
            </button>
            <p className="mt-4 text-center">
              <a href="#" onClick={(e) => { e.preventDefault(); setIsSignup(false); }} className="text-indigo-600 hover:underline">
                Back to Login
              </a>
            </p>
          </>
        ) : (
          <>
            <input
              className="w-full p-3 border rounded-lg mb-4 text-gray-700"
              placeholder="Roll No"
              value={rollNo}
              onChange={e => setRollNo(e.target.value)}
            />
            <input
              type="password"
              className="w-full p-3 border rounded-lg mb-4 text-gray-700"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              onClick={login}
              className="w-full bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition duration-300"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Login'}
            </button>
            <p className="mt-4 text-center">
              <a href="#" onClick={(e) => { e.preventDefault(); setIsSignup(true); }} className="text-indigo-600 hover:underline">
                Register for Hostel
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default Login;