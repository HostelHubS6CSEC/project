import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

function WardenDashboard() {  // Removed unused 'user' prop
  const [requests, setRequests] = useState({ passes: [], discontinuations: [] });
  const [comment, setComment] = useState('');
  const navigate = useNavigate();

  const loadRequests = useCallback(async () => {
    const { data: passes } = await supabase.from('passes').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    const { data: discontinuations } = await supabase.from('discontinuations').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    setRequests({ passes: passes || [], discontinuations: discontinuations || [] });
  }, []);

  useEffect(() => {
    loadRequests();
    const passSub = supabase.channel('passes').on('postgres_changes', { event: '*', schema: 'public', table: 'passes' }, loadRequests).subscribe();
    const discSub = supabase.channel('discontinuations').on('postgres_changes', { event: '*', schema: 'public', table: 'discontinuations' }, loadRequests).subscribe();
    
    return () => {
      supabase.removeChannel(passSub);
      supabase.removeChannel(discSub);
    };
  }, [loadRequests]);

  const updateRequest = async (id, type, status) => {
    const table = type === 'pass' ? 'passes' : 'discontinuations';
    const { error } = await supabase.from(table).update({ status, warden_comment: comment }).eq('id', id);
    if (error) toast.error(error.message);
    else toast.success(`${type} ${status}`, { className: 'bg-teal-500 text-white' });
    setComment('');
  };

  const logout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-teal-500 min-h-screen font-poppins p-6">
      <div className="flex justify-between mb-6 animate-slide-in">
        <h1 className="text-2xl font-bold text-white"><i className="fas fa-user-shield mr-2"></i> Welcome, Warden</h1>
        <button onClick={logout} className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition duration-300">Logout</button>
      </div>
      <div className="bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
        <h2 className="text-xl font-semibold text-indigo-600 mb-4">Pending Requests</h2>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Gate Passes</h3>
        {requests.passes.map(pass => (
          <div key={pass.id} className="p-4 bg-white rounded-lg mb-4 transform transition-all duration-300 hover:scale-105">
            <p className="text-gray-700">ID: {pass.id} | {pass.name} ({pass.roll_no}) | Leave: {pass.leave_date} {pass.leave_time} | Return: {pass.return_date} {pass.return_time} | Reason: {pass.reason}</p>
            <input className="w-full p-2 mt-2 border rounded-lg text-gray-700" placeholder="Add comment" value={comment} onChange={e => setComment(e.target.value)} />
            <div className="mt-2 flex space-x-2">
              <button onClick={() => updateRequest(pass.id, 'pass', 'approved')} className="bg-teal-500 text-white p-2 rounded-lg hover:bg-teal-600 transition duration-300">Approve</button>
              <button onClick={() => updateRequest(pass.id, 'pass', 'rejected')} className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition duration-300">Reject</button>
            </div>
          </div>
        ))}
        <h3 className="text-lg font-semibold text-gray-700 mb-2 mt-4">Discontinuations</h3>
        {requests.discontinuations.map(d => (
          <div key={d.id} className="p-4 bg-white rounded-lg mb-4 transform transition-all duration-300 hover:scale-105">
            <p className="text-gray-700">ID: {d.id} | Reason: {d.reason}</p>
            <input className="w-full p-2 mt-2 border rounded-lg text-gray-700" placeholder="Add comment" value={comment} onChange={e => setComment(e.target.value)} />
            <div className="mt-2 flex space-x-2">
              <button onClick={() => updateRequest(d.id, 'discontinuation', 'approved')} className="bg-teal-500 text-white p-2 rounded-lg hover:bg-teal-600 transition duration-300">Approve</button>
              <button onClick={() => updateRequest(d.id, 'discontinuation', 'rejected')} className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition duration-300">Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WardenDashboard;
