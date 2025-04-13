import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { supabase } from "../supabase/supabaseClient";
import { motion } from "framer-motion";

const GatePassForm = () => {
  const { user } = useContext(AuthContext);
  const [leaveDate, setLeaveDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("gate_passes").insert({
      student_id: user.id,
      name: user.email.split("@")[0], // Simplified name extraction
      roll_no: user.roll_no,
      semester: user.semester,
      branch: user.branch,
      leave_date: leaveDate,
      return_date: returnDate,
      reason,
    });
    if (error) alert(error.message);
    else {
      alert("Gate pass request submitted!");
      setLeaveDate("");
      setReturnDate("");
      setReason("");
    }
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white p-6 rounded-lg shadow-md"
    >
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Request Gate Pass</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="datetime-local"
          value={leaveDate}
          onChange={(e) => setLeaveDate(e.target.value)}
          className="w-full p-3 mb-4 border rounded-lg"
        />
        <input
          type="datetime-local"
          value={returnDate}
          onChange={(e) => setReturnDate(e.target.value)}
          className="w-full p-3 mb-4 border rounded-lg"
        />
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for leaving"
          className="w-full p-3 mb-4 border rounded-lg"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          type="submit"
          className="w-full bg-blue-500 text-white p-3 rounded-lg"
        >
          Submit Request
        </motion.button>
      </form>
    </motion.div>
  );
};

export default GatePassForm;