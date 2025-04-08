// src/components/StudentDashboard.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';

function StudentDashboard({ user, setUser }) {
  const [passes, setPasses] = useState([]);
  const [discontinuations, setDiscontinuations] = useState([]);
  const [bills, setBills] = useState([]);
  const [passForm, setPassForm] = useState({ leaveDate: '', leaveTime: '', returnDate: '', returnTime: '', reason: '' });
  const [discontinuationReason, setDiscontinuationReason] = useState('');
  const [profileEdit, setProfileEdit] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id || user.status !== 'active') navigate('/');
    const fetchData = async () => {
      const { data: passesData } = await supabase.from('passes').select('*').eq('student_id', user.id);
      const { data: discData } = await supabase.from('discontinuations').select('*').eq('student_id', user.id);
      const { data: billsData } = await supabase.from('mess_billing').select('*').eq('student_id', user.id);
      setPasses(passesData || []);
      setDiscontinuations(discData || []);
      setBills(billsData || []);
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

    return () => {
      supabase.removeChannel(passSub);
      supabase.removeChannel(discSub);
      supabase.removeChannel(billSub);
    };
  }, [user, navigate]);

  const requestPass = async () => {
    const { leaveDate, leaveTime, returnDate, returnTime, reason } = passForm;
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
    const { error } = await supabase.from('users').update(profileEdit).eq('id', user.id);
    if (error) toast.error('Profile update failed');
    else {
      toast.success('Profile updated');
      setUser({ ...user, ...profileEdit });
      localStorage.setItem('user', JSON.stringify({ ...user, ...profileEdit }));
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
    // Simulate payment
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

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-teal-500 min-h-screen font-poppins p-6">
      <div className="flex justify-between mb-6 animate-slide-in">
        <h1 className="text-2xl font-bold text-white"><i className="fas fa-user mr-2"></i> Welcome, {user.name}</h1>
        <button onClick={logout} className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition duration-300">Logout</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
          <h2 className="text-xl font-semibold text-indigo-600 mb-4">Profile</h2>
          {profileEdit ? (
            <>
              <input className="w-full p-2 mb-2 border rounded-lg" value={profileEdit.name} onChange={e => setProfileEdit({ ...profileEdit, name: e.target.value })} />
              <input className="w-full p-2 mb-2 border rounded-lg" value={profileEdit.semester} onChange={e => setProfileEdit({ ...profileEdit, semester: e.target.value })} />
              <input className="w-full p-2 mb-2 border rounded-lg" value={profileEdit.branch} onChange={e => setProfileEdit({ ...profileEdit, branch: e.target.value })} />
              <input className="w-full p-2 mb-2 border rounded-lg" value={profileEdit.phone} onChange={e => setProfileEdit({ ...profileEdit, phone: e.target.value })} />
              <button onClick={updateProfile} className="w-full bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700">Save</button>
              <button onClick={() => setProfileEdit(null)} className="w-full bg-gray-500 text-white p-2 rounded-lg mt-2">Cancel</button>
            </>
          ) : (
            <>
              <p>Name: {user.name}</p>
              <p>Roll No: {user.roll_no}</p>
              <p>Semester: {user.semester}</p>
              <p>Branch: {user.branch}</p>
              <p>Phone: {user.phone}</p>
              <p>Room: {user.room_no}</p>
              <button onClick={() => setProfileEdit({ name: user.name, semester: user.semester, branch: user.branch, phone: user.phone })} className="mt-2 bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600">Edit</button>
            </>
          )}
        </div>
        <div className="bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
          <h2 className="text-xl font-semibold text-indigo-600 mb-4">Request Pass</h2>
          <input type="date" value={passForm.leaveDate} onChange={e => setPassForm({ ...passForm, leaveDate: e.target.value })} className="w-full p-2 mb-2 border rounded-lg" />
          <input type="time" value={passForm.leaveTime} onChange={e => setPassForm({ ...passForm, leaveTime: e.target.value })} className="w-full p-2 mb-2 border rounded-lg" />
          <input type="date" value={passForm.returnDate} onChange={e => setPassForm({ ...passForm, returnDate: e.target.value })} className="w-full p-2 mb-2 border rounded-lg" />
          <input type="time" value={passForm.returnTime} onChange={e => setPassForm({ ...passForm, returnTime: e.target.value })} className="w-full p-2 mb-2 border rounded-lg" />
          <input placeholder="Reason" value={passForm.reason} onChange={e => setPassForm({ ...passForm, reason: e.target.value })} className="w-full p-2 mb-2 border rounded-lg" />
          <button onClick={requestPass} className="w-full bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition duration-300">Request Pass</button>
        </div>
        <div className="bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
          <h2 className="text-xl font-semibold text-indigo-600 mb-4">Request Permanent Leave</h2>
          <input placeholder="Reason" value={discontinuationReason} onChange={e => setDiscontinuationReason(e.target.value)} className="w-full p-2 mb-2 border rounded-lg" />
          <button onClick={requestDiscontinuation} className="w-full bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition duration-300">Request Discontinuation</button>
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