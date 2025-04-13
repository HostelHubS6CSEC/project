import React, { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import { motion } from "framer-motion";

const SecurityDashboard = () => {
  const [gatePasses, setGatePasses] = useState([]);

  useEffect(() => {
    const fetchGatePasses = async () => {
      const { data } = await supabase.from("gate_passes").select().eq("status", "approved");
      setGatePasses(data);
    };
    fetchGatePasses();

    const subscription = supabase
      .channel("gate_passes")
      .on("postgres_changes", { event: "*", schema: "public", table: "gate_passes" }, (payload) => {
        fetchGatePasses();
      })
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen bg-cover bg-center p-6"
      style={{ backgroundImage: "url(/images/dashboard-bg.jpg)" }}
    >
      <div className="bg-white/80 p-8 rounded-xl shadow-2xl max-w-4xl mx-auto backdrop-blur-md">
        <h1 className="text-4xl font-bold mb-6 text-gray-800">Gate Security Dashboard</h1>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Approved Gate Passes</h2>
        {gatePasses.map((pass) => (
          <motion.div
            key={pass.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white p-4 rounded-lg shadow-md mb-4"
          >
            <p>Name: {pass.name}</p>
            <p>Roll No: {pass.roll_no}</p>
            <p>Leave Date: {new Date(pass.leave_date).toLocaleString()}</p>
            <p>Return Date: {new Date(pass.return_date).toLocaleString()}</p>
            <p>Reason: {pass.reason}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default SecurityDashboard;