import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { supabase } from "../supabase/supabaseClient";
import GatePassForm from "./GatePassForm";
import MessBill from "./MessBill";
import DiscontinueForm from "./DiscontinueForm";
import { motion } from "framer-motion";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"; // Import pdf-lib

const StudentDashboard = () => {
  const { user } = useContext(AuthContext);
  const [gatePasses, setGatePasses] = useState([]);

  useEffect(() => {
    const fetchGatePasses = async () => {
      const { data } = await supabase.from("gate_passes").select().eq("student_id", user.id);
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
  }, [user]);

  const downloadGatePass = async (pass) => {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]); // Width: 600px, Height: 400px

    // Load a standard font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    const textColor = rgb(0, 0, 0); // Black color

    // Add content to the PDF
    page.drawText("HostelHub Gate Pass", {
      x: 50,
      y: 350,
      size: 20,
      font,
      color: rgb(0, 0.53, 0.71), // Blue color for title
    });

    page.drawText(`Name: ${pass.name}`, { x: 50, y: 320, size: fontSize, font, color: textColor });
    page.drawText(`Roll No: ${pass.roll_no}`, { x: 50, y: 300, size: fontSize, font, color: textColor });
    page.drawText(`Semester: ${pass.semester}`, { x: 50, y: 280, size: fontSize, font, color: textColor });
    page.drawText(`Branch: ${pass.branch}`, { x: 50, y: 260, size: fontSize, font, color: textColor });
    page.drawText(`Leave Date: ${new Date(pass.leave_date).toLocaleString()}`, {
      x: 50,
      y: 240,
      size: fontSize,
      font,
      color: textColor,
    });
    page.drawText(`Return Date: ${new Date(pass.return_date).toLocaleString()}`, {
      x: 50,
      y: 220,
      size: fontSize,
      font,
      color: textColor,
    });
    page.drawText(`Reason: ${pass.reason}`, { x: 50, y: 200, size: fontSize, font, color: textColor });
    page.drawText(`Status: ${pass.status}`, { x: 50, y: 180, size: fontSize, font, color: textColor });
    page.drawText(`Warden Approval: ${pass.warden_approval || "N/A"}`, {
      x: 50,
      y: 160,
      size: fontSize,
      font,
      color: textColor,
    });

    // Serialize the PDF to bytes
    const pdfBytes = await pdfDoc.save();

    // Create a blob and trigger download
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `gate_pass_${pass.roll_no}.pdf`;
    link.click();
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
        <h1 className="text-4xl font-bold mb-6 text-gray-800">Welcome, {user.email}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GatePassForm />
          <MessBill studentId={user.id} />
          <DiscontinueForm />
        </div>
        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-gray-800">Your Gate Passes</h2>
          <div className="mt-4 space-y-4">
            {gatePasses.map((pass) => (
              <motion.div
                key={pass.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white p-4 rounded-lg shadow-md"
              >
                <p className="text-gray-700">Reason: {pass.reason}</p>
                <p className="text-gray-700">Status: {pass.status}</p>
                {pass.status === "approved" && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => downloadGatePass(pass)}
                    className="mt-2 bg-green-500 text-white p-2 rounded-lg"
                  >
                    Download PDF
                  </motion.button>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default StudentDashboard;