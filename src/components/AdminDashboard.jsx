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
  const [noticeForm, setNoticeForm] = useState({ title: '', content: '', pdf: null });
  const [notices, setNotices] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id || user.role !== 'admin') navigate('/');
    const fetchData = async () => {
      const { data: studentsData } = await supabase.from('users').select('*').eq('role', 'student');
      const { data: noticesData } = await supabase.from('notices').select('*').order('posted_at', { ascending: false });
      setStudents(studentsData || []);
      setNotices(noticesData || []);
    };
    fetchData();

    const noticeSub = supabase.channel('notices').on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, payload => {
      if (payload.eventType === 'INSERT') setNotices(prev => [payload.new, ...prev]);
      if (payload.eventType === 'DELETE') setNotices(prev => prev.filter(n => n.id !== payload.old.id));
      toast.info(`Notice: ${payload.eventType === 'INSERT' ? payload.new.title : 'Deleted'}`);
    }).subscribe();

    return () => supabase.removeChannel(noticeSub);
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
    let pdfUrl = null;
    if (noticeForm.pdf) {
      try {
        const filePath = `pdfs/${Date.now()}_${noticeForm.pdf.name}`;
        const { data, error: uploadError } = await supabase.storage
          .from('notices')
          .upload(filePath, noticeForm.pdf, { upsert: true });
        if (uploadError) {
          console.error('PDF upload error:', uploadError);
          toast.error(`Failed to upload PDF: ${uploadError.message}`);
          return;
        }
        const { data: publicData } = supabase.storage.from('notices').getPublicUrl(filePath);
        pdfUrl = publicData.publicUrl;
      } catch (error) {
        console.error('Unexpected error during PDF upload:', error);
        toast.error('An unexpected error occurred during PDF upload');
        return;
      }
    }

    const { error } = await supabase
      .from('notices')
      .insert([{ title: noticeForm.title, content: noticeForm.content, posted_by: user.id, pdf_url: pdfUrl }]);
    if (error) toast.error('Failed to post notice');
    else {
      toast.success('Notice posted');
      setNoticeForm({ title: '', content: '', pdf: null });
    }
  };

  const deleteNotice = async (noticeId) => {
    const { error } = await supabase.from('notices').delete().eq('id', noticeId);
    if (error) toast.error('Failed to delete notice');
    else toast.success('Notice deleted');
  };

  const deleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        console.log(`Starting deletion process for user ${userId}`);

        // Fetch all pass IDs for the user
        const { data: passesData, error: fetchError } = await supabase
          .from('passes')
          .select('id')
          .eq('student_id', userId);
        if (fetchError) {
          console.error('Error fetching passes:', fetchError);
          throw new Error(`Failed to fetch passes: ${fetchError.message}`);
        }
        const passIds = passesData.map(p => p.id);

        // Delete related records in verification_logs for the user's passes
        if (passIds.length > 0) {
          console.log(`Deleting verification_logs for pass IDs: ${passIds.join(', ')}`);
          const { error: logError } = await supabase
            .from('verification_logs')
            .delete()
            .in('pass_id', passIds);
          if (logError) {
            console.error('Error deleting verification_logs:', logError);
            throw new Error(`Failed to delete verification_logs: ${logError.message}`);
          }
          console.log('Successfully deleted verification_logs');
        }

        // Delete related records in dependent tables
        const deleteRelated = async (table, column) => {
          console.log(`Attempting to delete from ${table} for ${column}=${userId}`);
          const { error } = await supabase.from(table).delete().eq(column, userId);
          if (error) {
            console.error(`Error deleting from ${table}:`, error);
            throw new Error(`Failed to delete from ${table}: ${error.message}`);
          }
          console.log(`Successfully deleted from ${table}`);
        };

        await deleteRelated('passes', 'student_id');
        await deleteRelated('discontinuations', 'student_id');
        await deleteRelated('attendance', 'student_id');
        await deleteRelated('mess_billing', 'student_id');

        // Verify deletion of related records
        const checkRelated = async (table, column) => {
          console.log(`Checking ${table} for remaining records with ${column}=${userId}`);
          const { data, error } = await supabase.from(table).select(column).eq(column, userId);
          if (error) {
            console.error(`Error checking ${table}:`, error);
            throw new Error(`Failed to check ${table}: ${error.message}`);
          }
          const isClear = data.length === 0;
          if (!isClear) console.warn(`Found ${data.length} remaining records in ${table}`);
          return isClear;
        };

        const passesClear = await checkRelated('passes', 'student_id');
        const discontinuationsClear = await checkRelated('discontinuations', 'student_id');
        const attendanceClear = await checkRelated('attendance', 'student_id');
        const billingClear = await checkRelated('mess_billing', 'student_id');

        if (!(passesClear && discontinuationsClear && attendanceClear && billingClear)) {
          throw new Error('Related records still exist');
        }

        // Delete the user
        console.log(`Attempting to delete user ${userId}`);
        const { error } = await supabase.from('users').delete().eq('id', userId);
        if (error) {
          console.error('Delete user error:', error);
          throw error;
        }
        console.log(`Successfully deleted user ${userId}`);
        toast.success('User and related data deleted');
        setStudents(prev => prev.filter(s => s.id !== userId));
      } catch (error) {
        console.error('Error during deletion process:', error);
        toast.error(`Failed to delete user: ${error.message || 'Unknown error'}`);
      }
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
            <div key={s.id} className="p-4 bg-white rounded-lg mb-2 flex justify-between items-center">
              <div>
                <p>Name: {s.name} | Roll No: {s.roll_no} | Room: {s.room_no || 'Not Allotted'} | Status: {s.status}</p>
              </div>
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
              <button
                onClick={() => deleteUser(s.id)}
                className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 ml-2"
              >
                Delete
              </button>
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
          <input type="file" accept="application/pdf" className="w-full p-2 mb-2" onChange={e => setNoticeForm({ ...noticeForm, pdf: e.target.files[0] })} />
          <button onClick={postNotice} className="w-full bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700">Post Notice</button>
        </div>
        <div className="bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
          <h2 className="text-xl font-semibold text-indigo-600 mb-4">Manage Notices</h2>
          {notices.map(notice => (
            <div key={notice.id} className="p-4 bg-white rounded-lg mb-2 flex justify-between items-center">
              <div>
                <h3 className="font-bold">{notice.title}</h3>
                <p className="text-sm text-gray-600">{notice.content}</p>
                <p className="text-xs text-gray-500">Posted: {new Date(notice.posted_at).toLocaleString()}</p>
              </div>
              <button onClick={() => deleteNotice(notice.id)} className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600">Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;