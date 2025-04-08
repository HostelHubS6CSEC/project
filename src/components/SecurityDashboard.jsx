// src/components/SecurityDashboard.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

function SecurityDashboard({ user }) {
  const [passId, setPassId] = useState('');
  const [pass, setPass] = useState(null);
  const [logs, setLogs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id || user.role !== 'security') navigate('/');
    const fetchLogs = async () => {
      const { data } = await supabase.from('verification_logs').select('*, passes(*)').eq('security_id', user.id).order('verified_at', { ascending: false });
      setLogs(data || []);
    };
    fetchLogs();

    const logSub = supabase.channel('verification_logs').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'verification_logs', filter: `security_id=eq.${user.id}` }, payload => {
      setLogs(prev => [payload.new, ...prev]);
      toast.info('Pass verified');
    }).subscribe();

    return () => supabase.removeChannel(logSub);
  }, [user, navigate]);

  const verifyPass = async () => {
    const { data, error } = await supabase.from('passes').select('*').eq('id', passId).eq('status', 'approved').single();
    if (error || !data) {
      toast.error('Invalid or unapproved pass');
      setPass(null);
    } else {
      setPass(data);
      const { error: logError } = await supabase.from('verification_logs').insert([{ pass_id: passId, security_id: user.id }]);
      if (logError) toast.error('Failed to log verification');
      else toast.success('Pass verified');
    }
    setPassId('');
  };

  const logout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-teal-500 min-h-screen font-poppins p-6">
      <div className="flex justify-between mb-6 animate-slide-in">
        <h1 className="text-2xl font-bold text-white">Welcome, Security</h1>
        <button onClick={logout} className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600">Logout</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
          <h2 className="text-xl font-semibold text-indigo-600 mb-4">Verify Pass</h2>
          <input
            className="w-full p-2 mb-2 border rounded-lg"
            placeholder="Enter Pass ID"
            value={passId}
            onChange={e => setPassId(e.target.value)}
          />
          <button onClick={verifyPass} className="w-full bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700">Verify</button>
          {pass && (
            <div className="mt-4 p-4 bg-white rounded-lg">
              <p>Name: {pass.name}</p>
              <p>Roll No: {pass.roll_no}</p>
              <p>Leave: {pass.leave_date} {pass.leave_time}</p>
              <p>Return: {pass.return_date} {pass.return_time}</p>
              <p>Reason: {pass.reason}</p>
              <p className="text-green-600 font-bold">APPROVED</p>
            </div>
          )}
        </div>
        <div className="bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
          <h2 className="text-xl font-semibold text-indigo-600 mb-4">Verification Logs</h2>
          {logs.map(log => (
            <div key={log.id} className="p-4 bg-white rounded-lg mb-2">
              <p>Pass ID: {log.pass_id}</p>
              <p>Student: {log.passes.name} ({log.passes.roll_no})</p>
              <p>Verified At: {new Date(log.verified_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SecurityDashboard;