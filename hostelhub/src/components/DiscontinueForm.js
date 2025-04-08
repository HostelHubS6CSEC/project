import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { supabase } from "../supabase/supabaseClient";
import { motion } from "framer-motion";

const DiscontinueForm = () => {
  const { user } = useContext(AuthContext);
  const [reason, setReason] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("discontinue_requests").insert({
      student_id: user.id,
      reason,
    });
    if (error) alert(error.message);
    else {
      alert("Discontinuation request submitted!");
      setReason("");
    }
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white p-6 rounded-lg shadow-md"
    >
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Discontinue Hostel Stay</h3>
      <form onSubmit={handleSubmit}>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for discontinuation"
          className="w-full p-3 mb-4 border rounded-lg"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          type="submit"
          className="w-full bg-red-500 text-white p-3 rounded-lg"
        >
          Submit Request
        </motion.button>
      </form>
    </motion.div>
  );
};

export default DiscontinueForm;