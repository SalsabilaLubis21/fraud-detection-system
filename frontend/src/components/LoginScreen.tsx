import React, { useState } from "react";
import {
  ShieldCheck,
  User,
  ShieldAlert,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import { UserRole, UserSession } from "../types";

interface LoginScreenProps {
  onLogin: (session: UserSession) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState<string>("budi.santoso@amanbank.id");
  const [password, setPassword] = useState<string>("password123");
  const [role, setRole] = useState<UserRole>("CUSTOMER");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handlePresetSelect = (presetRole: UserRole) => {
    if (presetRole === "CUSTOMER") {
      setEmail("budi.santoso@amanbank.id");
      setPassword("password123");
      setRole("CUSTOMER");
    } else {
      setEmail("security.officer@amanbank.id");
      setPassword("adminPass2026!");
      setRole("ADMIN");
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password || password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let errorDetail =
          "Login failed. Please check your credentials and try again.";
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || errorDetail;
        } catch (jsonError) {
          console.error("Could not parse error response as JSON", jsonError);
        }
        throw new Error(errorDetail);
      }

      const data = await response.json();

      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("name", data.full_name);
      localStorage.setItem("email", email);

      onLogin({
        user_id: data.user_id,
        email,
        name: data.full_name,
        role: data.role,
        isLoggedIn: true,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/80 via-slate-50 to-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Header Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#1E3A8A] text-white shadow-lg shadow-blue-900/10 border border-blue-900/20">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            AmanBank
          </h1>
          <p className="text-xs font-semibold text-[#1E3A8A] uppercase tracking-widest mt-1">
            XGBoost ML Fraud-Shield Portal
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/60 rounded-2xl border border-slate-200 sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Sign In to Account
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select your portal role and enter your login credentials below
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Role Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Select Role / Portal View
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("CUSTOMER")}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                    role === "CUSTOMER"
                      ? "border-[#1E3A8A] bg-blue-50/80 ring-2 ring-[#1E3A8A]/20"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <User
                      className={`w-4 h-4 ${role === "CUSTOMER" ? "text-[#1E3A8A]" : "text-slate-500"}`}
                    />
                    {role === "CUSTOMER" && (
                      <CheckCircle className="w-3.5 h-3.5 text-[#1E3A8A]" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    Customer
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    Banking User Portal
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("ADMIN")}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                    role === "ADMIN"
                      ? "border-[#1E3A8A] bg-blue-50/80 ring-2 ring-[#1E3A8A]/20"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <ShieldAlert
                      className={`w-4 h-4 ${role === "ADMIN" ? "text-[#1E3A8A]" : "text-slate-500"}`}
                    />
                    {role === "ADMIN" && (
                      <CheckCircle className="w-3.5 h-3.5 text-[#1E3A8A]" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    Admin Security
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    Fraud Command Center
                  </span>
                </button>
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@amanbank.id"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#1E3A8A] hover:bg-blue-900 shadow-md shadow-blue-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1E3A8A] transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>
                    Sign In to{" "}
                    {role === "ADMIN" ? "Admin Portal" : "Customer Account"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Preset Buttons for Quick Login */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-3">
              Quick Demo Account Presets
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handlePresetSelect("CUSTOMER")}
                className="flex items-center justify-center space-x-1.5 p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Customer Demo</span>
              </button>

              <button
                type="button"
                onClick={() => handlePresetSelect("ADMIN")}
                className="flex items-center justify-center space-x-1.5 p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
                <span>Admin Demo</span>
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center space-x-1.5 text-[11px] text-slate-400">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>256-Bit SSL Encrypted • XGBoost ML Anti-Fraud Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
