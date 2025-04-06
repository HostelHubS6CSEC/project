import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import { toast } from 'react-toastify';

function StudentDashboard({ user, setUser }) {
  const [passes, setPasses] = useState([]);
  const [messHistory, setMessHistory] = useState([]);
  const [passData, setPassData] = useState({ leave_date: '', leave_time: '', return_date: '', return_time: '', reason: '' });
  const [discontinueReason, setDiscontinueReason] = useState('');
  const navigate = useNavigate();

  // Memoize these functions with useCallback to prevent unnecessary re-renders
  const loadPasses = useCallback(async () => {
    const { data } = await supabase.from('passes').select('*').eq('student_id', user.id).order('created_at', { ascending: false });
    setPasses(data || []);
  }, [user.id]);

  const loadMessHistory = useCallback(async () => {
    const { data } = await supabase.from('mess_billing').select('*').eq('student_id', user.id).order('updated_at', { ascending: false });
    setMessHistory(data || []);
  }, [user.id]);

  useEffect(() => {
    loadPasses();
    loadMessHistory();
    
    const passSub = supabase.channel('passes').on('postgres_changes', { event: '*', schema: 'public', table: 'passes', filter: `student_id=eq.${user.id}` }, loadPasses).subscribe();
    const userSub = supabase.channel('users').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` }, (payload) => setUser(payload.new)).subscribe();
    const messSub = supabase.channel('mess_billing').on('postgres_changes', { event: '*', schema: 'public', table: 'mess_billing', filter: `student_id=eq.${user.id}` }, loadMessHistory).subscribe();
    
    return () => {
      supabase.removeChannel(passSub);
      supabase.removeChannel(userSub);
      supabase.removeChannel(messSub);
    };
  }, [user.id, loadPasses, loadMessHistory, setUser]);

  const requestPass = async () => {
    const { error } = await supabase.from('passes').insert([{ ...passData, student_id: user.id, name: user.name, roll_no: user.roll_no, semester: user.semester, branch: user.branch }]);
    if (error) toast.error(error.message);
    else toast.success('Pass requested', { className: 'bg-teal-500 text-white' });
    setPassData({ leave_date: '', leave_time: '', return_date: '', return_time: '', reason: '' });
  };

  const discontinue = async () => {
    const { error } = await supabase.from('discontinuations').insert([{ student_id: user.id, reason: discontinueReason }]);
    if (error) toast.error(error.message);
    else toast.success('Discontinuation requested', { className: 'bg-teal-500 text-white' });
    setDiscontinueReason('');
  };

  const downloadPDF = (pass) => {
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.text(`Hostel Gate Pass\n\nPass ID: ${pass.id}\nName: ${pass.name}\nRoll No: ${pass.roll_no}\nSemester: ${pass.semester}\nBranch: ${pass.branch}\nLeave: ${pass.leave_date} ${pass.leave_time}\nReturn: ${pass.return_date} ${pass.return_time}\nReason: ${pass.reason}\nStatus: Approved\nWarden Comment: ${pass.warden_comment || 'N/A'}`, 10, 10);
    doc.save(`GatePass_${pass.id}.pdf`);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-teal-500 min-h-screen font-poppins p-6">
      <div className="flex justify-between mb-6 animate-slide-in">
        <h1 className="text-2xl font-bold text-white"><i className="fas fa-user-graduate mr-2"></i> Welcome, {user.name}</h1>
        <button onClick={logout} className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition duration-300">Logout</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
          <h2 className="text-xl font-semibold text-indigo-600 mb-4">Profile</h2>
          <p className="text-gray-700">Name: {user.name}<br />Roll No: {user.roll_no}<br />Semester: {user.semester}<br />Branch: {user.branch}<br />Phone: {user.phone}<br />Room No: {user.room_no}<br />Mess Bill: ₹{user.mess_bill}</p>
        </div>
        <div className="bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
          <h2 className="text-xl font-semibold text-indigo-600 mb-4">Request Gate Pass</h2>
          <input type="date" className="w-full p-2 mb-2 border rounded-lg text-gray-700" value={passData.leave_date} onChange={e => setPassData({ ...passData, leave_date: e.target.value })} />
          <input type="time" className="w-full p-2 mb-2 border rounded-lg text-gray-700" value={passData.leave_time} onChange={e => setPassData({ ...passData, leave_time: e.target.value })} />
          <input type="date" className="w-full p-2 mb-2 border rounded-lg text-gray-700" value={passData.return_date} onChange={e => setPassData({ ...passData, return_date: e.target.value })} />
          <input type="time" className="w-full p-2 mb-2 border rounded-lg text-gray-700" value={passData.return_time} onChange={e => setPassData({ ...passData, return_time: e.target.value })} />
          <input className="w-full p-2 mb-2 border rounded-lg text-gray-700" placeholder="Reason (e.g., Holiday)" value={passData.reason} onChange={e => setPassData({ ...passData, reason: e.target.value })} />
          <button onClick={requestPass} className="w-full bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition duration-300">Request</button>
        </div>
        <div className="bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
          <h2 className="text-xl font-semibold text-indigo-600 mb-4">Discontinue Hostel</h2>
          <input className="w-full p-2 mb-2 border rounded-lg text-gray-700" placeholder="Reason for leaving" value={discontinueReason} onChange={e => setDiscontinueReason(e.target.value)} />
          <button onClick={discontinue} className="w-full bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition duration-300">Apply</button>
        </div>
      </div>
      <div className="mt-6 bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
        <h2 className="text-xl font-semibold text-indigo-600 mb-4">Your Passes</h2>
        <div className="space-y-4">
          {passes.map(pass => (
            <div key={pass.id} className="p-4 bg-white rounded-lg transform transition-all duration-300 hover:scale-105">
              <p className="text-gray-700">ID: {pass.id} | Leave: {pass.leave_date} {pass.leave_time} | Return: {pass.return_date} {pass.return_time} | Reason: {pass.reason} | Status: {pass.status}</p>
              {pass.status === 'approved' && (
                <div className="mt-2 flex justify-center">
                  <button onClick={() => downloadPDF(pass)} className="bg-teal-500 text-white p-2 rounded-lg hover:bg-teal-600 transition duration-300">Download PDF</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
        <h2 className="text-xl font-semibold text-indigo-600 mb-4">Mess Bill History</h2>
        <div className="space-y-4">
          {messHistory.map(bill => (
            <div key={bill.id} className="p-4 bg-white rounded-lg">
              <p className="text-gray-700">Month: {bill.month} | Amount: ₹{bill.amount} | Paid: {bill.paid ? 'Yes' : 'No'} | Updated: {new Date(bill.updated_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
