// src/components/MessDashboard.jsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

function MessDashboard({ user }) {
  const [month, setMonth] = useState('');
  const [students, setStudents] = useState([]);
  const [unpaidBills, setUnpaidBills] = useState([]);
  const navigate = useNavigate();

  const loadStudents = useCallback(async () => {
    const { data } = await supabase.from('users').select('id, roll_no, name, mess_bill').eq('role', 'student').eq('status', 'active');
    setStudents(data || []);
  }, []);

  const loadUnpaidBills = useCallback(async () => {
    const { data } = await supabase.from('mess_billing').select('*, users(name, roll_no)').eq('paid', false);
    setUnpaidBills(data || []);
  }, []);

  useEffect(() => {
    if (!user?.id || user.role !== 'mess') navigate('/');
    loadStudents();
    loadUnpaidBills();
  }, [user, navigate, loadStudents, loadUnpaidBills]);

  const calculateMessBill = async () => {
    const [year, monthNum] = month.split('-');
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const presentRate = 145;
    const absentRate = 20;

    for (const student of students) {
      const { data: attendance } = await supabase
        .from('attendance')
        .select('present')
        .eq('student_id', student.id)
        .gte('date', `${month}-01`)
        .lte('date', `${month}-${daysInMonth}`);

      const presentDays = attendance?.filter(a => a.present).length || 0;
      const absentDays = daysInMonth - presentDays;
      const amount = (presentDays * presentRate) + (absentDays * absentRate);

      const { error: billError } = await supabase.from('mess_billing').insert([{
        student_id: student.id,
        roll_no: student.roll_no,
        month,
        amount,
        paid: false
      }]);
      const { error: userError } = await supabase
        .from('users')
        .update({ mess_bill: student.mess_bill + amount })
        .eq('id', student.id);

      if (billError || userError) toast.error(`Error updating bill for ${student.roll_no}`);
    }
    toast.success('Mess bills calculated');
    loadStudents();
    loadUnpaidBills();
  };

  const markAsPaid = async (billId, studentId, amount) => {
    const { data: student } = await supabase.from('users').select('mess_bill').eq('id', studentId).single();
    const newBill = student.mess_bill - amount;
    const { error: billError } = await supabase.from('mess_billing').update({ paid: true }).eq('id', billId);
    const { error: userError } = await supabase.from('users').update({ mess_bill: newBill }).eq('id', studentId);
    if (billError || userError) toast.error('Error marking as paid');
    else {
      toast.success('Bill marked as paid');
      loadStudents();
      loadUnpaidBills();
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-teal-500 min-h-screen font-poppins p-6">
      <div className="flex justify-between mb-6 animate-slide-in">
        <h1 className="text-2xl font-bold text-white">Welcome, Mess Incharge</h1>
        <button onClick={logout} className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600">Logout</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
          <h2 className="text-xl font-semibold text-indigo-600 mb-4">Calculate Mess Bill</h2>
          <input
            type="month"
            className="w-full p-2 mb-2 border rounded-lg"
            value={month}
            onChange={e => setMonth(e.target.value)}
          />
          <button onClick={calculateMessBill} className="w-full bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700">Calculate Bills</button>
        </div>
        <div className="bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
          <h2 className="text-xl font-semibold text-indigo-600 mb-4">Student Billing Status</h2>
          {students.map(s => (
            <div key={s.roll_no} className="p-4 bg-white rounded-lg mb-2">
              <p>Name: {s.name} | Roll No: {s.roll_no} | Mess Bill: ₹{s.mess_bill || 0}</p>
            </div>
          ))}
        </div>
        <div className="bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
          <h2 className="text-xl font-semibold text-indigo-600 mb-4">Unpaid Bills</h2>
          {unpaidBills.map(bill => (
            <div key={bill.id} className="p-4 bg-white rounded-lg mb-2 flex justify-between items-center">
              <p>Name: {bill.users.name} | Roll No: {bill.roll_no} | Month: {bill.month} | Amount: ₹{bill.amount}</p>
              <button onClick={() => markAsPaid(bill.id, bill.student_id, bill.amount)} className="bg-teal-500 text-white p-2 rounded-lg hover:bg-teal-600">Mark as Paid</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MessDashboard;