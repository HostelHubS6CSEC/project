import React, { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import { motion } from "framer-motion";

const MessDashboard = () => {
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [month, setMonth] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    const fetchStudents = async () => {
      const { data } = await supabase.from("users").select("id, email").eq("role", "student");
      setStudents(data);
    };
    fetchStudents();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("mess_bills").insert({ student_id: studentId, month, amount });
    if (error) alert(error.message);
    else {
      alert("Mess bill updated!");
      setStudentId("");
      setMonth("");
      setAmount("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-cover bg-center p-6"
      style={{ backgroundImage: "url(/images/dashboard-bg.jpg)" }}
    >
      <div className="bg-white/80 p-8 rounded-xl shadow-2xl max-w-4xl mx-auto backdrop-blur-md">
        <h1 className="text-4xl font-bold mb-6 text-gray-800">Mess Incharge Dashboard</h1>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Update Mess Bill</h2>
        <form onSubmit={handleSubmit}>
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="w-full p-3 mb-4 border rounded-lg"
          >
            <option value="">Select Student</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.email}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            placeholder="Month (e.g., March 2025)"
            className="w-full p-3 mb-4 border rounded-lg"
          />
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="w-full p-3 mb-4 border rounded-lg"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            type="submit"
            className="w-full bg-blue-500 text-white p-3 rounded-lg"
          >
            Update Bill
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
};

export default MessDashboard;