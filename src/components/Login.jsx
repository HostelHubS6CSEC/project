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
    room_no: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const login = async () => {
        try {
          setLoading(true);
          
          if (!rollNo || !password) {
            toast.error('Please enter both roll number and password');
            return;
          }
          
          // Get user by roll number
          const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('roll_no', rollNo.trim())
            .single();
          
          if (error) {
            console.error('User lookup error:', error);
            toast.error('Invalid roll number');
            return;
          }
          
          // Verify password
          const passwordMatches = await bcrypt.compare(password, user.password);
          
          if (!passwordMatches) {
            toast.error('Invalid password');
            return;
          }
          
          // Login successful
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
      

  const validateRollNo = (rollNo) => {
    // Check if roll number is at least 3 characters long
    if (rollNo.length < 3) {
      toast.error('Roll number must be at least 3 characters long');
      return false;
    }
    
    // Check if roll number contains valid characters
    if (!/^[a-zA-Z0-9_-]+$/.test(rollNo)) {
      toast.error('Roll number can only contain letters, numbers, underscores and hyphens');
      return false;
    }
    
    return true;
  };

  const signup = async () => {
    try {
      setLoading(true);
      
      if (!rollNo || !password || !signupData.name || !signupData.semester) {
        toast.error('Please fill all required fields');
        return;
      }
      
      if (!validateRollNo(rollNo)) return;
      
      // Check if roll number exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('roll_no')
        .eq('roll_no', rollNo)
        .single();
      
      if (existingUser) {
        throw new Error('Roll number already exists');
      }
      
      // Hash the password before storing
      const hashedPassword = await bcrypt.hash(password, 10);
      console.log('Generated hash for signup:', hashedPassword);
      
      // Insert new user with hashed password
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
          room_no: signupData.room_no,
          mess_bill: 0,
        }]);
      
      if (insertError) throw insertError;
      
      toast.success('Signup successful, please login');
      setIsSignup(false);
      setPassword('');
    } catch (error) {
      toast.error(`Signup failed: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Rest of your component remains the same
  return (
    <div className="bg-gradient-to-br from-indigo-600 to-teal-500 min-h-screen flex items-center justify-center font-poppins">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-500 hover:scale-105">
        <img src="https://source.unsplash.com/300x100/?hostel" alt="Hostel" className="w-full h-24 object-cover rounded-t-2xl mb-6" />
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6 animate-fade-in">
          <i className="fas fa-home mr-2 text-indigo-600"></i> HostelHub
        </h1>
        {isSignup ? (
          <>
            <input className="w-full p-3 border rounded-lg mb-4 text-gray-700" placeholder="Roll No" value={rollNo} onChange={e => setRollNo(e.target.value)} />
            <input className="w-full p-3 border rounded-lg mb-4 text-gray-700" placeholder="Semester" value={signupData.semester} onChange={e => setSignupData({ ...signupData, semester: e.target.value })} />
            <input className="w-full p-3 border rounded-lg mb-4 text-gray-700" placeholder="Name" value={signupData.name} onChange={e => setSignupData({ ...signupData, name: e.target.value })} />
            <input className="w-full p-3 border rounded-lg mb-4 text-gray-700" placeholder="Branch" value={signupData.branch} onChange={e => setSignupData({ ...signupData, branch: e.target.value })} />
            <input className="w-full p-3 border rounded-lg mb-4 text-gray-700" placeholder="Phone" value={signupData.phone} onChange={e => setSignupData({ ...signupData, phone: e.target.value })} />
            <input className="w-full p-3 border rounded-lg mb-4 text-gray-700" placeholder="Room No" value={signupData.room_no} onChange={e => setSignupData({ ...signupData, room_no: e.target.value })} />
            <input type="password" className="w-full p-3 border rounded-lg mb-4 text-gray-700" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
            <button 
              onClick={signup}
              className="w-full bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition duration-300"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Sign Up'}
            </button>
            <p className="mt-4 text-center"><a href="#" onClick={(e) => { e.preventDefault(); setIsSignup(false); }} className="text-indigo-600 hover:underline">Back to Login</a></p>
          </>
        ) : (
          <>
            <input className="w-full p-3 border rounded-lg mb-4 text-gray-700" placeholder="Roll No" value={rollNo} onChange={e => setRollNo(e.target.value)} />
            <input type="password" className="w-full p-3 border rounded-lg mb-4 text-gray-700" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
            <button 
              onClick={login}
              className="w-full bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition duration-300"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Login'}
            </button>
            <p className="mt-4 text-center"><a href="#" onClick={(e) => { e.preventDefault(); setIsSignup(true); }} className="text-indigo-600 hover:underline">Sign Up</a></p>
          </>
        )}
      </div>
    </div>
  );
}

export default Login;
