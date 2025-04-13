// src/components/StudentDashboard.jsx
import { useState, useEffect, useRef } from 'react'; // Added useRef
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import dp from '../assets/dp.jpg'; // Import the local image

function StudentDashboard({ user, setUser }) {
  const [passes, setPasses] = useState([]);
  const [discontinuations, setDiscontinuations] = useState([]);
  const [bills, setBills] = useState([]);
  const [notices, setNotices] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [viewedNotices, setViewedNotices] = useState(() => {
    const saved = localStorage.getItem('viewedNotices');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [passForm, setPassForm] = useState({ leaveDate: '', leaveTime: '', returnDate: '', returnTime: '', reason: '' });
  const [discontinuationReason, setDiscontinuationReason] = useState('');
  const [profileEdit, setProfileEdit] = useState(null);
  const [showNotices, setShowNotices] = useState(false);
  const navigate = useNavigate();
  const noticesRef = useRef(null); // Ref for the notices section

  const defaultProfilePic = dp; // Use local image instead of URL

  const handleDownloadPDF = async (url, filename) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download PDF');
    }
  };

  // Effect to close notices when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotices && noticesRef.current && !noticesRef.current.contains(event.target)) {
        setShowNotices(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotices]);

  useEffect(() => {
    if (!user?.id || user.status !== 'active') navigate('/');
    const fetchData = async () => {
      const { data: passesData } = await supabase.from('passes').select('*').eq('student_id', user.id);
      const { data: discData } = await supabase.from('discontinuations').select('*').eq('student_id', user.id);
      const { data: billsData } = await supabase.from('mess_billing').select('*').eq('student_id', user.id);
      const { data: noticesData } = await supabase.from('notices').select('*').order('posted_at', { ascending: false });
      const { data: attendanceData } = await supabase.from('attendance').select('*').eq('student_id', user.id);
      setPasses(passesData || []);
      setDiscontinuations(discData || []);
      setBills(billsData || []);
      setNotices(noticesData || []);
      setAttendance(attendanceData || []);
    };
    fetchData();

    const passSub = supabase.channel('passes').on('postgres_changes', { event: '*', schema: 'public', table: 'passes', filter: `student_id=eq.${user.id}` }, payload => {
      if (payload.eventType === 'INSERT') setPasses(prev => [...prev, payload.new]);
      if (payload.eventType === 'UPDATE') setPasses(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
      toast.info('Pass status updated');
    }).subscribe();

    const discSub = supabase.channel('discontinuations').on('postgres_changes', { event: '*', schema: 'public', table: 'discontinuations', filter: `student_id=eq.${user.id}` }, payload => {
      if (payload.eventType === 'INSERT') setDiscontinuations(prev => [...prev, payload.new]);
      if (payload.eventType === 'UPDATE') setDiscontinuations(prev => prev.map(d => d.id === payload.new.id ? payload.new : d));
      toast.info('Discontinuation status updated');
    }).subscribe();

    const billSub = supabase.channel('mess_billing').on('postgres_changes', { event: '*', schema: 'public', table: 'mess_billing', filter: `student_id=eq.${user.id}` }, payload => {
      if (payload.eventType === 'INSERT') setBills(prev => [...prev, payload.new]);
      if (payload.eventType === 'UPDATE') setBills(prev => prev.map(b => b.id === payload.new.id ? payload.new : b));
      toast.info('Bill status updated');
    }).subscribe();

    const noticeSub = supabase.channel('notices').on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, payload => {
      if (payload.eventType === 'INSERT') {
        setNotices(prev => [payload.new, ...prev]);
        toast.info(`New Notice: ${payload.new.title}`);
      }
      if (payload.eventType === 'DELETE') setNotices(prev => prev.filter(n => n.id !== payload.old.id));
    }).subscribe();

    const attendanceSub = supabase.channel('attendance').on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `student_id=eq.${user.id}` }, payload => {
      if (payload.eventType === 'INSERT') setAttendance(prev => [...prev, payload.new]);
      if (payload.eventType === 'UPDATE') setAttendance(prev => prev.map(a => a.id === payload.new.id ? payload.new : a));
      toast.info('Attendance updated');
    }).subscribe();

    return () => {
      supabase.removeChannel(passSub);
      supabase.removeChannel(discSub);
      supabase.removeChannel(billSub);
      supabase.removeChannel(noticeSub);
      supabase.removeChannel(attendanceSub);
    };
  }, [user, navigate]);

  const requestPass = async () => {
    const { leaveDate, leaveTime, returnDate, returnTime, reason } = passForm;
    if (!leaveDate || !leaveTime || !returnDate || !returnTime || !reason) {
      toast.error('All fields are required');
      return;
    }
    const { data, error } = await supabase.from('passes').insert([{
      student_id: user.id,
      name: user.name,
      roll_no: user.roll_no,
      semester: user.semester,
      branch: user.branch,
      leave_date: leaveDate,
      leave_time: leaveTime,
      return_date: returnDate,
      return_time: returnTime,
      reason,
      status: 'pending',
      qr_code: `QR_${Date.now()}`
    }]).select().single();
    if (error) toast.error('Pass request failed');
    else {
      setPasses(prev => [...prev, data]);
      toast.success('Pass requested');
      setPassForm({ leaveDate: '', leaveTime: '', returnDate: '', returnTime: '', reason: '' });
    }
  };

  const requestDiscontinuation = async () => {
    const { error } = await supabase.from('discontinuations').insert([{ student_id: user.id, reason: discontinuationReason, status: 'pending' }]);
    if (error) toast.error('Discontinuation request failed');
    else {
      toast.success('Discontinuation requested');
      setDiscontinuationReason('');
    }
  };

  const updateProfile = async () => {
    const { error } = await supabase.from('users').update({ ...profileEdit, profile_pic: defaultProfilePic }).eq('id', user.id);
    if (error) {
      console.error('Profile update error:', error);
      toast.error('Profile update failed');
    } else {
      toast.success('Profile updated');
      const updatedUser = { ...user, ...profileEdit, profile_pic: defaultProfilePic };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setProfileEdit(null);
    }
  };

  const downloadPassPDF = (pass) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a5' });
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('HostelHub Gate Pass', 74, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('FISAT Hostel', 74, 22, { align: 'center' });
    doc.line(10, 28, 138, 28);
    doc.rect(10, 35, 128, 150);
    doc.setFontSize(12);
    doc.text(`Pass Number: ${pass.id}`, 15, 45);
    doc.text(`Name: ${pass.name}`, 15, 55);
    doc.text(`Roll No: ${pass.roll_no}`, 15, 65);
    doc.text(`Semester: ${pass.semester}`, 15, 75);
    doc.text(`Branch: ${pass.branch}`, 15, 85);
    doc.text(`Leave: ${pass.leave_date} ${pass.leave_time}`, 15, 95);
    doc.text(`Return: ${pass.return_date} ${pass.return_time}`, 15, 105);
    doc.text(`Reason: ${pass.reason}`, 15, 115);
    if (pass.warden_comment) doc.text(`Warden Comment: ${pass.warden_comment}`, 15, 125);
    if (pass.status === 'approved') {
      doc.setTextColor(0, 128, 0);
      doc.setFontSize(14);
      doc.text('APPROVED', 115, 125, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }
    doc.setFontSize(10);
    doc.text('Warden Signature: ____________________', 15, 195);
    doc.line(10, 200, 138, 200);
    doc.text('Approved by Hostel Administration', 74, 205, { align: 'center' });
    doc.save(`GatePass_${pass.id}.pdf`);
    toast.success('Pass PDF downloaded!');
  };

  const downloadBillPDF = (bill) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a5' });
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('HostelHub Mess Bill', 74, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('FISAT Hostel', 74, 22, { align: 'center' });
    doc.line(10, 28, 138, 28);
    doc.rect(10, 35, 128, 150);
    doc.setFontSize(12);
    doc.text(`Name: ${user.name}`, 15, 45);
    doc.text(`Roll No: ${user.roll_no}`, 15, 55);
    doc.text(`Month: ${bill.month}`, 15, 65);
    doc.text(`Amount: ₹${bill.amount}`, 15, 75);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    if (bill.paid) {
      doc.setTextColor(0, 128, 0);
      doc.setDrawColor(0, 128, 0);
      doc.rect(100, 80, 30, 10);
      doc.text('PAID', 115, 87, { align: 'center' });
    } else {
      doc.setTextColor(255, 0, 0);
      doc.text('UNPAID', 115, 87, { align: 'center' });
    }
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
    doc.setFontSize(10);
    doc.line(10, 200, 138, 200);
    doc.text('Payable at Hostel Office | Contact: admin@hostel.xyz', 74, 205, { align: 'center' });
    doc.save(`MessBill_${bill.id}.pdf`);
    toast.success('Bill PDF downloaded!');
  };

  const payBill = async (billId, amount) => {
    const { error: billError } = await supabase.from('mess_billing').update({ paid: true }).eq('id', billId);
    const { error: userError } = await supabase.from('users').update({ mess_bill: user.mess_bill - amount }).eq('id', user.id);
    if (billError || userError) toast.error('Payment failed');
    else {
      toast.success('Payment successful');
      setBills(prev => prev.map(b => b.id === billId ? { ...b, paid: true } : b));
      setUser({ ...user, mess_bill: user.mess_bill - amount });
      localStorage.setItem('user', JSON.stringify({ ...user, mess_bill: user.mess_bill - amount }));
    }
  };

  const handleNoticeView = (noticeId) => {
    setViewedNotices(prev => {
      const newSet = new Set(prev);
      newSet.add(noticeId);
      localStorage.setItem('viewedNotices', JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  // Upcoming Deadlines
  const today = new Date();
  const nextBillDue = bills
    .filter(b => !b.paid)
    .map(b => {
      const [month, year] = b.month.split(' ');
      const billDate = new Date(`${month} 1, ${year}`);
      const dueMonth = billDate.getMonth() + 1; // Next month (0-11 to 1-12)
      const dueYear = dueMonth === 12 ? billDate.getFullYear() + 1 : billDate.getFullYear();
      return new Date(dueYear, dueMonth % 12, 10); // 10th of next month
    })
    .filter(d => d >= today)
    .sort((a, b) => a - b)[0] || null;
  const nextPassReturn = passes
    .filter(p => p.status === 'approved' && new Date(p.return_date) >= today)
    .sort((a, b) => new Date(a.return_date) - new Date(b.return_date))[0]?.return_date || null;

  // Mess Fee Stats
  const unpaidBills = bills.filter(b => !b.paid).length;
  const totalUnpaidAmount = bills.filter(b => !b.paid).reduce((sum, b) => sum + b.amount, 0);

  // Check-In/Check-Out Status
  const activePass = passes.find(p => 
    p.status === 'approved' &&
    new Date(p.leave_date) <= today &&
    new Date(p.return_date) >= today
  );
  const earlyReturn = activePass && attendance.some(a => 
    a.present && 
    new Date(a.date) >= new Date(activePass.leave_date) && 
    new Date(a.date) < new Date(activePass.return_date)
  );
  const isCheckedOut = activePass && !earlyReturn;

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-teal-500 min-h-screen font-poppins p-6">
      <h1 className="text-4xl font-bold text-white text-center mb-6 animate-fade-in">HostelHub</h1>

      <div className="flex justify-between mb-6 animate-slide-in">
        <h2 className="text-2xl font-bold text-white"><i className="fas fa-user mr-2"></i> Welcome, {user.name}</h2>
        <div className="flex items-center space-x-4">
          <button onClick={() => setShowNotices(!showNotices)} className="relative text-white">
            <i className="fas fa-bell text-2xl"></i>
            {notices.length - viewedNotices.size > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {notices.length - viewedNotices.size}
              </span>
            )}
          </button>
          <button onClick={() => { setUser(null); localStorage.removeItem('user'); navigate('/'); }} className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition duration-300">Logout</button>
        </div>
      </div>

      {showNotices && (
        <div ref={noticesRef} className="absolute top-16 right-6 bg-white p-4 rounded-lg shadow-lg max-h-96 overflow-y-auto z-10">
          <h3 className="text-lg font-semibold text-indigo-600 mb-2">Notices</h3>
          {notices.length === 0 ? (
            <p>No notices available.</p>
          ) : (
            notices.map(notice => (
              <div key={notice.id} className="p-2 border-b last:border-b-0">
                <h4 className="font-bold">{notice.title}</h4>
                <p className="text-sm text-gray-600">{notice.content}</p>
                <p className="text-xs text-gray-500">Posted: {new Date(notice.posted_at).toLocaleString()}</p>
                {notice.pdf_url && (
                  <button
                    className="text-blue-500 text-sm hover:underline"
                    onClick={() => {
                      handleDownloadPDF(notice.pdf_url, `Notice_${notice.id}.pdf`);
                      handleNoticeView(notice.id);
                    }}
                  >
                    Download PDF
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Section */}
        <div className="bg-white p-6 rounded-2xl shadow-lg animate-fade-in">
          <div className="flex items-center space-x-4">
            <img
              src={user.profile_pic || defaultProfilePic}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-4 border-indigo-600"
            />
            <div>
              <h2 className="text-xl font-semibold text-indigo-600">{user.name}</h2>
              <p className="text-gray-600">Roll No: {user.roll_no}</p>
            </div>
          </div>
          <div className="mt-4 border-t pt-4">
            {profileEdit ? (
              <div className="space-y-4">
                <input
                  className="w-full p-2 border rounded-lg"
                  value={profileEdit.name}
                  onChange={e => setProfileEdit({ ...profileEdit, name: e.target.value })}
                  placeholder="Name"
                />
                <input
                  className="w-full p-2 border rounded-lg"
                  value={profileEdit.semester}
                  onChange={e => setProfileEdit({ ...profileEdit, semester: e.target.value })}
                  placeholder="Semester"
                />
                <input
                  className="w-full p-2 border rounded-lg"
                  value={profileEdit.branch}
                  onChange={e => setProfileEdit({ ...profileEdit, branch: e.target.value })}
                  placeholder="Branch"
                />
                <input
                  className="w-full p-2 border rounded-lg"
                  value={profileEdit.phone}
                  onChange={e => setProfileEdit({ ...profileEdit, phone: e.target.value })}
                  placeholder="Phone"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={updateProfile}
                    className="w-full bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setProfileEdit(null)}
                    className="w-full bg-gray-500 text-white p-2 rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-gray-700"><strong>Semester:</strong> {user.semester}</p>
                  <p className="text-gray-700"><strong>Branch:</strong> {user.branch}</p>
                  <p className="text-gray-700"><strong>Phone:</strong> {user.phone}</p>
                  <p className="text-gray-700"><strong>Room:</strong> {user.room_no || 'Not Assigned'}</p>
                </div>
                {/* Upcoming Deadlines */}
                <div className="border-t pt-2">
                  <h3 className="text-lg font-semibold text-indigo-600">Upcoming Deadlines</h3>
                  <p className="text-gray-700">
                    Next Mess Bill Due: {nextBillDue ? `${new Date(nextBillDue).toLocaleDateString()} (10th of next month)` : 'None'}
                  </p>
                  <p className="text-gray-700">
                    Next Pass Return: {nextPassReturn ? new Date(nextPassReturn).toLocaleDateString() : 'None'}
                  </p>
                </div>
                {/* Mess Fee Stats */}
                <div className="border-t pt-2">
                  <h3 className="text-lg font-semibold text-indigo-600">Mess Fee Stats</h3>
                  <p className="text-gray-700">Total Due: ₹{user.mess_bill}</p>
                  <p className="text-gray-700">Unpaid Bills: {unpaidBills}</p>
                  <p className="text-gray-700">Unpaid Amount: ₹{totalUnpaidAmount}</p>
                </div>
                {/* Check-In/Check-Out Status */}
                <div className="border-t pt-2">
                  <h3 className="text-lg font-semibold text-indigo-600">Check-In/Check-Out</h3>
                  <p className="text-gray-700">
                    Status: <span className={isCheckedOut ? 'text-red-600' : 'text-green-600'}>{isCheckedOut ? 'Checked Out' : 'Checked In'}</span>
                  </p>
                </div>
                <button
                  onClick={() => setProfileEdit({ name: user.name, semester: user.semester, branch: user.branch, phone: user.phone })}
                  className="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 mt-2"
                >
                  Edit Profile
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Gate Pass Request */}
        <div className="bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
          <h2 className="text-xl font-semibold text-indigo-600 mb-4">Request Gate Pass</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-1">Leaving Date</label>
              <input
                type="date"
                value={passForm.leaveDate}
                onChange={e => setPassForm({ ...passForm, leaveDate: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Leaving Time</label>
              <input
                type="time"
                value={passForm.leaveTime}
                onChange={e => setPassForm({ ...passForm, leaveTime: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Return Date</label>
              <input
                type="date"
                value={passForm.returnDate}
                onChange={e => setPassForm({ ...passForm, returnDate: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Return Time</label>
              <input
                type="time"
                value={passForm.returnTime}
                onChange={e => setPassForm({ ...passForm, returnTime: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Reason for Leave</label>
              <input
                placeholder="Enter reason"
                value={passForm.reason}
                onChange={e => setPassForm({ ...passForm, reason: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <button
              onClick={requestPass}
              className="w-full bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition duration-300"
            >
              Request Pass
            </button>
          </div>
        </div>

        <div className="bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
          <h2 className="text-xl font-semibold text-indigo-600 mb-4">Request Permanent Leave</h2>
          <input
            placeholder="Reason"
            value={discontinuationReason}
            onChange={e => setDiscontinuationReason(e.target.value)}
            className="w-full p-2 mb-2 border rounded-lg"
          />
          <button
            onClick={requestDiscontinuation}
            className="w-full bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition duration-300"
          >
            Request Discontinuation
          </button>
        </div>

        <div className="bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
          <h2 className="text-xl font-semibold text-indigo-600 mb-4">History</h2>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Gate Passes</h3>
          {passes.map(pass => (
            <div key={pass.id} className="p-4 bg-white rounded-lg mb-2">
              <p>Status: {pass.status} | Leave: {pass.leave_date} {pass.leave_time} | Return: {pass.return_date} {pass.return_time} | Reason: {pass.reason}</p>
              {pass.warden_comment && <p className="text-gray-600">Comment: {pass.warden_comment}</p>}
              {pass.status === 'approved' && (
                <button onClick={() => downloadPassPDF(pass)} className="mt-2 bg-green-500 text-white p-1 rounded-lg hover:bg-green-600 transition duration-300">Download PDF</button>
              )}
            </div>
          ))}
          <h3 className="text-lg font-semibold text-gray-700 mb-2 mt-4">Mess Bills</h3>
          {bills.map(bill => (
            <div key={bill.id} className="p-4 bg-white rounded-lg mb-2 flex justify-between items-center">
              <p>Month: {bill.month} | Amount: ₹{bill.amount} | Paid: {bill.paid ? 'Yes' : 'No'}</p>
              {!bill.paid && <button onClick={() => payBill(bill.id, bill.amount)} className="bg-blue-500 text-white p-1 rounded-lg hover:bg-blue-600 transition duration-300">Pay Now</button>}
              <button onClick={() => downloadBillPDF(bill)} className="bg-green-500 text-white p-1 rounded-lg hover:bg-green-600 transition duration-300">Download PDF</button>
            </div>
          ))}
          <p className="mt-2">Total Mess Bill: ₹{user.mess_bill}</p>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;