"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { identifyUser, trackEvent } from "@/lib/analytics";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (
    email: string,
    password: string,
    name: string
  ) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      identifyUser(u?.uid ?? null);
    });
    return unsubscribe;
  }, []);

  const loginWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    trackEvent("login", { method: "password" });
  };

  const signupWithEmail = async (
    email: string,
    password: string,
    name: string
  ) => {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    await updateProfile(credential.user, { displayName: name });
    trackEvent("sign_up", { method: "password" });
    setUser(
      Object.assign(
        Object.create(Object.getPrototypeOf(credential.user)),
        credential.user
      )
    );
  };

  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    const isNewUser =
      result.user.metadata.creationTime === result.user.metadata.lastSignInTime;
    trackEvent(isNewUser ? "sign_up" : "login", { method: "google" });
  };

  const logout = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, loginWithEmail, signupWithEmail, loginWithGoogle, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
