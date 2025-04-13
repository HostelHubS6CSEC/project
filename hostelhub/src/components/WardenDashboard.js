import React, { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import { motion } from "framer-motion";

const WardenDashboard = () => {
  const [gatePasses, setGatePasses] = useState([]);
  const [discontinueRequests, setDiscontinueRequests] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: passes } = await supabase.from("gate_passes").select().eq("status", "pending");
      const { data: requests } = await supabase.from("discontinue_requests").select().eq("status", "pending");
      setGatePasses(passes);
      setDiscontinueRequests(requests);
    };
    fetchData();

    const passSubscription = supabase
      .channel("gate_passes")
      .on("postgres_changes", { event: "*", schema: "public", table: "gate_passes" }, (payload) => {
        fetchData();
      })
      .subscribe();

    const requestSubscription = supabase
      .channel("discontinue_requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "discontinue_requests" }, (payload) => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(passSubscription);
      supabase.removeChannel(requestSubscription);
    };
  }, []);

  const handleGatePassAction = async (id, status) => {
    const { error } = await supabase
      .from("gate_passes")
      .update({ status, warden_approval: status === "approved" ? "Approved by Warden" : "Rejected by Warden" })
      .eq("id", id);
    if (error) alert(error.message);
  };

  const handleDiscontinueAction = async (id, status) => {
    const { error } = await supabase.from("discontinue_requests").update({ status }).eq("id", id);
    if (error) alert(error.message);
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
        <h1 className="text-4xl font-bold mb-6 text-gray-800">Warden Dashboard</h1>
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Pending Gate Passes</h2>
        {gatePasses.map((pass) => (
          <motion.div
            key={pass.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white p-4 rounded-lg shadow-md mb-4"
          >
            <p>Name: {pass.name}</p>
            <p>Roll No: {pass.roll_no}</p>
            <p>Reason: {pass.reason}</p>
            <div className="mt-2 space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => handleGatePassAction(pass.id, "approved")}
                className="bg-green-500 text-white p-2 rounded-lg"
              >
                Approve
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => handleGatePassAction(pass.id, "rejected")}
                className="bg-red-500 text-white p-2 rounded-lg"
              >
                Reject
              </motion.button>
            </div>
          </motion.div>
        ))}
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 mt-8">Pending Discontinue Requests</h2>
        {discontinueRequests.map((request) => (
          <motion.div
            key={request.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white p-4 rounded-lg shadow-md mb-4"
          >
            <p>Student ID: {request.student_id}</p>
            <p>Reason: {request.reason}</p>
            <div className="mt-2 space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => handleDiscontinueAction(request.id, "approved")}
                className="bg-green-500 text-white p-2 rounded-lg"
              >
                Approve
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => handleDiscontinueAction(request.id, "rejected")}
                className="bg-red-500 text-white p-2 rounded-lg"
              >
                Reject
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default WardenDashboard;