import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

function SecurityDashboard({ user }) {
  const [passId, setPassId] = useState('');
  const [passDetails, setPassDetails] = useState(null);
  const [logs, setLogs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const { data } = await supabase.from('security_logs').select('*').order('verified_at', { ascending: false });
    setLogs(data || []);
  };

  const verifyPass = async () => {
    const { data, error } = await supabase.from('passes').select('*').eq('id', passId).eq('status', 'approved').single();
    if (error || !data) {
      toast.error('Invalid or unapproved pass');
      setPassDetails(null);
      await supabase.from('security_logs').insert([{ pass_id: passId, security_id: user.id, status: 'denied' }]);
      loadLogs();
      return;
    }
    setPassDetails(data);
    await supabase.from('security_logs').insert([{ pass_id: passId, security_id: user.id, status: 'verified' }]);
    toast.success('Pass verified', { className: 'bg-teal-500 text-white' });
    loadLogs();
  };

  const logout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-teal-500 min-h-screen font-poppins p-6">
      <div className="flex justify-between mb-6 animate-slide-in">
        <h1 className="text-2xl font-bold text-white"><i className="fas fa-shield-alt mr-2"></i> Welcome, Gate Security</h1>
        <button onClick={logout} className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition duration-300">Logout</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
          <h2 className="text-xl font-semibold text-indigo-600 mb-4">Verify Pass</h2>
          <input className="w-full p-2 mb-2 border rounded-lg text-gray-700" placeholder="Pass ID" value={passId} onChange={e => setPassId(e.target.value)} />
          <button onClick={verifyPass} className="w-full bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition duration-300">Verify</button>
          {passDetails && (
            <div className="mt-4 p-4 bg-white rounded-lg">
              <p className="text-gray-700">Name: ${passDetails.name} | Roll No: ${passDetails.roll_no}<br />
              Leave: ${passDetails.leave_date} ${passDetails.leave_time} | Return: ${passDetails.return_date} ${passDetails.return_time}<br />
              Reason: ${passDetails.reason} | Status: Approved</p>
            </div>
          )}
        </div>
        <div className="bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
          <h2 className="text-xl font-semibold text-indigo-600 mb-4">Verification Logs</h2>
          <div className="space-y-4">
            {logs.map(log => (
              <div key={log.id} className="p-4 bg-white rounded-lg">
                <p className="text-gray-700">Pass ID: ${log.pass_id} | Status: ${log.status} | Verified: ${new Date(log.verified_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SecurityDashboard;