import React, { createContext, useContext, useState, useEffect } from "react";
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from "../config/firebase";
import { setApiUserOverride } from "../api/api";

const AuthContext = createContext(null);

// QA bypass flag — only honoured when explicitly enabled via VITE_QA_BYPASS_AUTH=true.
// Production builds never set this (the .env used for production is free of it), and
// the value is also forced to false in PROD to make accidental enablement impossible.
const RAW_QA_BYPASS = (import.meta.env.VITE_QA_BYPASS_AUTH || "").toLowerCase() === "true";
const QA_BYPASS_AUTH = RAW_QA_BYPASS && !import.meta.env.PROD;

const QA_USER = {
  uid: "qa-demo-user",
  email: "qa@freegraduates.test",
  displayName: "QA Demo User",
  photoURL: "",
  emailVerified: true,
  isAnonymous: false,
  // Implement the bare minimum of firebase.User that the codebase actually
  // touches via auth.currentUser.* so consumers don't blow up.
  getIdToken: async () => "qa-bypass-token",
  getIdTokenResult: async () => ({ claims: { role: "qa" }, token: "qa-bypass-token" }),
  reload: async () => {},
  toJSON: () => ({ uid: "qa-demo-user" }),
};

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(QA_BYPASS_AUTH ? QA_USER : null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (QA_BYPASS_AUTH) {
      // Skip Firebase entirely — the QA bypass user is already set above.
      // Push it into the axios interceptor so every backend call is scoped
      // to this UID (otherwise axios would fall back to `demo-student-uid`
      // and the user's saved data would be invisible).
      setApiUserOverride(QA_USER);
      setLoading(false);
      return undefined;
    }
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setApiUserOverride(user || null);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Email & Password Signup
  const signup = async (email, password, displayName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
      setCurrentUser({ ...userCredential.user, displayName });
    }
    return userCredential.user;
  };

  // Email & Password Login
  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  };

  // Google OAuth Login
  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  };

  // Logout
  const logout = () => {
    return signOut(auth);
  };

  // Reset Password
  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  // Get current ID Token for API requests
  const getIdToken = async () => {
    if (currentUser) {
      return await currentUser.getIdToken();
    }
    return "dev-token";
  };

  const value = {
    currentUser,
    loading,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    getIdToken
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
