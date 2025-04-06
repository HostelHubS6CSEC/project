import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

function MessDashboard() {  // Removed unused 'user' prop
  const [rollNo, setRollNo] = useState('');
  const [month, setMonth] = useState('');
  const [amount, setAmount] = useState('');
  const [students, setStudents] = useState([]);
  const navigate = useNavigate();

  const loadStudents = useCallback(async () => {
    const { data } = await supabase.from('users').select('roll_no, name, mess_bill').eq('role', 'student');
    setStudents(data || []);
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const updateMessBill = async () => {
    const { data: student } = await supabase.from('users').select('id, mess_bill').eq('roll_no', rollNo).single();
    if (!student) {
      toast.error('Student not found');
      return;
    }
    const newBill = (student.mess_bill || 0) + parseFloat(amount);
    const { error: billError } = await supabase.from('mess_billing').insert([{ 
      student_id: student.id, 
      roll_no: rollNo,  // Fixed: using rollNo instead of roll_no
      month, 
      amount: parseFloat(amount) 
    }]);
    const { error: userError } = await supabase.from('users').update({ mess_bill: newBill }).eq('roll_no', rollNo);
    
    if (billError || userError) toast.error('Error updating bill');
    else toast.success('Mess bill updated', { className: 'bg-teal-500 text-white' });
    
    setRollNo('');
    setMonth('');
    setAmount('');
    loadStudents();
  };

  const logout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-teal-500 min-h-screen font-poppins p-6">
      <div className="flex justify-between mb-6 animate-slide-in">
        <h1 className="text-2xl font-bold text-white"><i className="fas fa-utensils mr-2"></i> Welcome, Mess Incharge</h1>
        <button onClick={logout} className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition duration-300">Logout</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
          <h2 className="text-xl font-semibold text-indigo-600 mb-4">Update Mess Bill</h2>
          <input className="w-full p-2 mb-2 border rounded-lg text-gray-700" placeholder="Student Roll No" value={rollNo} onChange={e => setRollNo(e.target.value)} />
          <input className="w-full p-2 mb-2 border rounded-lg text-gray-700" placeholder="Month (e.g., March 2025)" value={month} onChange={e => setMonth(e.target.value)} />
          <input type="number" className="w-full p-2 mb-2 border rounded-lg text-gray-700" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} />
          <button onClick={updateMessBill} className="w-full bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition duration-300">Update Bill</button>
        </div>
        <div className="bg-gray-100 p-6 rounded-2xl shadow-lg animate-fade-in">
          <h2 className="text-xl font-semibold text-indigo-600 mb-4">Student Billing Status</h2>
          <div className="space-y-4">
            {students.map(s => (
              <div key={s.roll_no} className="p-4 bg-white rounded-lg">
                <p className="text-gray-700">Name: {s.name} | Roll No: {s.roll_no} | Mess Bill: ₹{s.mess_bill || 0}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MessDashboard;
