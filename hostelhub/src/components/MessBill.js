import React, { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import { motion } from "framer-motion";

const MessBill = ({ studentId }) => {
  const [bills, setBills] = useState([]);

  useEffect(() => {
    const fetchBills = async () => {
      const { data } = await supabase.from("mess_bills").select().eq("student_id", studentId);
      setBills(data);
    };
    fetchBills();

    const subscription = supabase
      .channel("mess_bills")
      .on("postgres_changes", { event: "*", schema: "public", table: "mess_bills" }, (payload) => {
        fetchBills();
      })
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, [studentId]);

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white p-6 rounded-lg shadow-md"
    >
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Mess Bills</h3>
      {bills.length === 0 ? (
        <p className="text-gray-600">No bills available.</p>
      ) : (
        bills.map((bill) => (
          <div key={bill.id} className="mb-2">
            <p className="text-gray-700">
              {bill.month}: ₹{bill.amount}
            </p>
          </div>
        ))
      )}
    </motion.div>
  );
};

export default MessBill;