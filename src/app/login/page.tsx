"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HardHat, Mail, Phone, Languages } from "lucide-react";
import type { ConfirmationResult } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

type Mode = "login" | "signup";
type Method = "email" | "phone";

export default function LoginPage() {
  const { user, loading, loginWithEmail, signupWithEmail, sendPhoneOtp } =
    useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("login");
  const [method, setMethod] = useState<Method>("email");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(
    null
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) {
      router.replace("/sites");
    }
  }, [user, loading, router]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await loginWithEmail(email, password);
      } else {
        await signupWithEmail(email, password);
      }
      router.replace("/sites");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await sendPhoneOtp(phone, "recaptcha-container");
      setConfirmation(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (!confirmation) return;
      await confirmation.confirm(otp);
      router.replace("/sites");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setBusy(false);
    }
  };

  if (loading || (!loading && user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-sm text-slate-500">{t("loading")}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <button
        onClick={toggleLanguage}
        className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      >
        <Languages className="h-3.5 w-3.5" />
        {language === "en" ? "தமிழ்" : "English"}
      </button>

      <div className="mb-6 flex flex-col items-center gap-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg">
          <HardHat className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("appName")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("appTagline")}
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <div className="mb-4 flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              mode === "login"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-500"
            }`}
          >
            {t("login")}
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              mode === "signup"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-500"
            }`}
          >
            {t("signup")}
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => {
              setMethod("email");
              setConfirmation(null);
              setError("");
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium ${
              method === "email"
                ? "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400"
                : "border-slate-200 text-slate-500 dark:border-slate-700"
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            {t("email")}
          </button>
          <button
            onClick={() => {
              setMethod("phone");
              setError("");
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium ${
              method === "phone"
                ? "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400"
                : "border-slate-200 text-slate-500 dark:border-slate-700"
            }`}
          >
            <Phone className="h-3.5 w-3.5" />
            {t("phoneNumber")}
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        {method === "email" && (
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
            <Input
              label={t("email")}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <Input
              label={t("password")}
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <Button type="submit" loading={busy} fullWidth>
              {mode === "login" ? t("login") : t("signup")}
            </Button>
          </form>
        )}

        {method === "phone" && !confirmation && (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-3">
            <Input
              label={t("phoneNumber")}
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91XXXXXXXXXX"
            />
            <div id="recaptcha-container" />
            <Button type="submit" loading={busy} fullWidth>
              {t("sendOtp")}
            </Button>
          </form>
        )}

        {method === "phone" && confirmation && (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
            <Input
              label={t("otpCode")}
              type="text"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
            />
            <Button type="submit" loading={busy} fullWidth>
              {t("verifyOtp")}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
