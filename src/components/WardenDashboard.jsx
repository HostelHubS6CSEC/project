// src/components/WardenDashboard.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

function WardenDashboard({ user }) {
  const [passes, setPasses] = useState([]);
  const [discontinuations, setDiscontinuations] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id || user.role !== 'warden') navigate('/');
    const fetchData = async () => {
      const { data: passesData } = await supabase.from('passes').select('*').in('status', ['pending', 'approved', 'rejected']);
      const { data: discData } = await supabase.from('discontinuations').select('*').in('status', ['pending', 'approved', 'rejected']);
      const { data: studentsData } = await supabase.from('users').select('*').eq('role', 'student').eq('status', 'active').order('name');
      setPasses(passesData || []);
      setDiscontinuations(discData || []);
      setStudents(studentsData || []);
    };
    fetchData();

    const passSub = supabase.channel('passes').on('postgres_changes', { event: '*', schema: 'public', table: 'passes' }, payload => {
      if (payload.eventType === 'INSERT') setPasses(prev => [...prev, payload.new]);
      if (payload.eventType === 'UPDATE') setPasses(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
      toast.info('Pass updated');
    }).subscribe();

    const discSub = supabase.channel('discontinuations').on('postgres_changes', { event: '*', schema: 'public', table: 'discontinuations' }, payload => {
      if (payload.eventType === 'INSERT') setDiscontinuations(prev => [...prev, payload.new]);
      if (payload.eventType === 'UPDATE') setDiscontinuations(prev => prev.map(d => d.id === payload.new.id ? payload.new : d));
      toast.info('Discontinuation updated');
    }).subscribe();

    return () => {
      supabase.removeChannel(passSub);
      supabase.removeChannel(discSub);
    };
  }, [user, navigate]);

  const updatePass = async (id, status, comment = '') => {
    const { error } = await supabase.from('passes').update({ status, warden_comment: comment }).eq('id', id);
    if (error) toast.error(`Failed to ${status} pass`);
    else toast.success(`Pass ${status}`);
  };

  const updateDiscontinuation = async (id, status, comment = '') => {
    const { error } = await supabase.from('discontinuations').update({ status, warden_comment: comment }).eq('id', id);
    if (error) toast.error(`Failed to ${status} discontinuation`);
    else {
      toast.success(`Discontinuation ${status}`);
      if (status === 'approved') {
        const studentId = discontinuations.find(d => d.id === id).student_id;
        await supabase.from('users').update({ status: 'vacated', room_no: null }).eq('id', studentId);
      }
    }
  };

  const markAttendance = async (studentId, date) => {
    const present = attendanceData[studentId] || false;
    const { error } = await supabase
      .from('attendance')
      .upsert(
        [{ student_id: studentId, date, present }],
        { onConflict: ['student_id', 'date'], update: ['present'] } // Update 'present' on conflict
      );
    if (error) {
      console.error('Attendance error:', error);
      toast.error('Failed to mark attendance');
    } else {
      toast.success('Attendance marked');
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const groupedStudents = students.reduce((acc, s) => {
    acc[s.semester] = acc[s.semester] || [];
    acc[s.semester].push(s);
    return acc;
  }, {});

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-teal-500 min-h-screen font-poppins p-6">
      <div className="flex justify-between mb-6 animate-slide-in">
        <h1 className="text-2xl font-bold text-white">Welcome, Warden</h1>
        <button onClick={logout} className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600">Logout</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
          <h2 className="text-xl font-semibold text-indigo-600 mb-4">Pending Passes</h2>
          {passes.filter(p => p.status === 'pending').map(pass => (
            <div key={pass.id} className="p-4 bg-white rounded-lg mb-2">
              <p>Name: {pass.name} | Roll No: {pass.roll_no} | Leave: {pass.leave_date} {pass.leave_time} | Return: {pass.return_date} {pass.return_time} | Reason: {pass.reason}</p>
              <input className="w-full p-2 mt-2 border rounded-lg" placeholder="Comment" onChange={e => pass.warden_comment = e.target.value} />
              <button onClick={() => updatePass(pass.id, 'approved', pass.warden_comment)} className="bg-green-500 text-white p-2 rounded-lg mt-2 mr-2 hover:bg-green-600">Approve</button>
              <button onClick={() => updatePass(pass.id, 'rejected', pass.warden_comment)} className="bg-red-500 text-white p-2 rounded-lg mt-2 hover:bg-red-600">Reject</button>
            </div>
          ))}
        </div>
        <div className="bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
          <h2 className="text-xl font-semibold text-indigo-600 mb-4">Pending Discontinuations</h2>
          {discontinuations.filter(d => d.status === 'pending').map(d => (
            <div key={d.id} className="p-4 bg-white rounded-lg mb-2">
              <p>Reason: {d.reason}</p>
              <input className="w-full p-2 mt-2 border rounded-lg" placeholder="Comment" onChange={e => d.warden_comment = e.target.value} />
              <button onClick={() => updateDiscontinuation(d.id, 'approved', d.warden_comment)} className="bg-green-500 text-white p-2 rounded-lg mt-2 mr-2 hover:bg-green-600">Approve</button>
              <button onClick={() => updateDiscontinuation(d.id, 'rejected', d.warden_comment)} className="bg-red-500 text-white p-2 rounded-lg mt-2 hover:bg-red-600">Reject</button>
            </div>
          ))}
        </div>
        <div className="bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
          <h2 className="text-xl font-semibold text-indigo-600 mb-4">Mark Attendance</h2>
          {Object.entries(groupedStudents).map(([semester, students]) => (
            <div key={semester}>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Semester {semester}</h3>
              {students.map(s => (
                <div key={s.id} className="p-4 bg-white rounded-lg mb-2 flex justify-between items-center">
                  <p>{s.name} ({s.roll_no})</p>
                  <label>
                    <input
                      type="checkbox"
                      checked={attendanceData[s.id] || false}
                      onChange={e => setAttendanceData({ ...attendanceData, [s.id]: e.target.checked })}
                    />
                    <span className="ml-2">Present</span>
                  </label>
                  <button onClick={() => markAttendance(s.id, new Date().toISOString().split('T')[0])} className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700">Mark</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WardenDashboard;