// src/components/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import bcrypt from 'bcryptjs';

function AdminDashboard({ user }) {
  const [students, setStudents] = useState([]);
  const [roomNo, setRoomNo] = useState('');
  const [newStaff, setNewStaff] = useState({ roll_no: '', password: '', role: '', name: '', phone: '' });
  const [noticeForm, setNoticeForm] = useState({ title: '', content: '' });
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id || user.role !== 'admin') navigate('/');
    const fetchStudents = async () => {
      const { data } = await supabase.from('users').select('*').eq('role', 'student');
      setStudents(data || []);
    };
    fetchStudents();
  }, [user, navigate]);

  const allotRoom = async (studentId) => {
    const { error } = await supabase
      .from('users')
      .update({ room_no: roomNo, status: 'active' })
      .eq('id', studentId);
    if (error) toast.error('Failed to allot room');
    else {
      toast.success('Room allotted');
      setRoomNo('');
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, room_no: roomNo, status: 'active' } : s));
    }
  };

  const addStaff = async () => {
    const hashedPassword = await bcrypt.hash(newStaff.password, 10);
    const { error } = await supabase.from('users').insert([{
      roll_no: newStaff.roll_no,
      password: hashedPassword,
      role: newStaff.role,
      name: newStaff.name,
      phone: newStaff.phone,
      status: 'active'
    }]);
    if (error) toast.error('Failed to add staff');
    else {
      toast.success(`${newStaff.role} added`);
      setNewStaff({ roll_no: '', password: '', role: '', name: '', phone: '' });
    }
  };

  const postNotice = async () => {
    const { error } = await supabase
      .from('notices')
      .insert([{ title: noticeForm.title, content: noticeForm.content, posted_by: user.id }]);
    if (error) toast.error('Failed to post notice');
    else {
      toast.success('Notice posted');
      setNoticeForm({ title: '', content: '' });
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-teal-500 min-h-screen font-poppins p-6">
      <div className="flex justify-between mb-6 animate-slide-in">
        <h1 className="text-2xl font-bold text-white">Welcome, Admin</h1>
        <button onClick={logout} className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600">Logout</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
          <h2 className="text-xl font-semibold text-indigo-600 mb-4">Manage Students</h2>
          {students.map(s => (
            <div key={s.id} className="p-4 bg-white rounded-lg mb-2">
              <p>Name: {s.name} | Roll No: {s.roll_no} | Room: {s.room_no || 'Not Allotted'} | Status: {s.status}</p>
              {s.status === 'pending' && (
                <>
                  <input
                    className="p-2 border rounded-lg mt-2"
                    placeholder="Room No"
                    value={roomNo}
                    onChange={e => setRoomNo(e.target.value)}
                  />
                  <button onClick={() => allotRoom(s.id)} className="bg-green-500 text-white p-2 rounded-lg mt-2 ml-2">Allot Room</button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
          <h2 className="text-xl font-semibold text-indigo-600 mb-4">Add Warden/Security</h2>
          <input className="w-full p-2 mb-2 border rounded-lg" placeholder="Roll No" value={newStaff.roll_no} onChange={e => setNewStaff({ ...newStaff, roll_no: e.target.value })} />
          <input className="w-full p-2 mb-2 border rounded-lg" placeholder="Password" value={newStaff.password} onChange={e => setNewStaff({ ...newStaff, password: e.target.value })} />
          <select className="w-full p-2 mb-2 border rounded-lg" value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value })}>
            <option value="">Select Role</option>
            <option value="warden">Warden</option>
            <option value="security">Security</option>
          </select>
          <input className="w-full p-2 mb-2 border rounded-lg" placeholder="Name" value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} />
          <input className="w-full p-2 mb-2 border rounded-lg" placeholder="Phone" value={newStaff.phone} onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })} />
          <button onClick={addStaff} className="w-full bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700">Add Staff</button>
        </div>
        <div className="bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
          <h2 className="text-xl font-semibold text-indigo-600 mb-4">Post Notice</h2>
          <input className="w-full p-2 mb-2 border rounded-lg" placeholder="Title" value={noticeForm.title} onChange={e => setNoticeForm({ ...noticeForm, title: e.target.value })} />
          <textarea className="w-full p-2 mb-2 border rounded-lg" placeholder="Content" value={noticeForm.content} onChange={e => setNoticeForm({ ...noticeForm, content: e.target.value })} />
          <button onClick={postNotice} className="w-full bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700">Post Notice</button>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;