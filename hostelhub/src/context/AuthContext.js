import React, { createContext, useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const session = supabase.auth.getSession();
    setUser(session?.user || null);

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const { data: userData } = await supabase.from("users").select("*").eq("id", data.user.id).single();
    setUser({ ...data.user, ...userData });
    return data;
  };

  const signup = async (email, password, role, roll_no, semester, branch) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    await supabase.from("users").insert({ id: data.user.id, email, role, roll_no, semester, branch });
    setUser({ ...data.user, role, roll_no, semester, branch });
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};