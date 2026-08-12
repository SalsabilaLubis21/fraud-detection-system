import React from "react";
import { ShieldCheck, User, ShieldAlert, LogOut } from "lucide-react";
import { UserSession } from "../types";

interface HeaderProps {
  activePortal: "customer" | "admin";
  setActivePortal: (portal: "customer" | "admin") => void;
  blockedCount: number;
  userSession: UserSession | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activePortal,
  setActivePortal,
  blockedCount,
  userSession,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E3A8A] flex items-center justify-center text-white shadow-md shadow-blue-900/10">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  AmanBank
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#1E3A8A] border border-blue-200">
                  Smart Fraud Detection
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Fraud-Protected ML Banking System
              </p>
            </div>
          </div>

          {/* Portal Switcher Tabs & User Auth Controls */}
          <div className="flex items-center space-x-3">
            {/* Logged in User Session & Logout Button */}
            {userSession && (
              <div className="flex items-center space-x-3 pl-3 border-l border-slate-200">
                <div className="text-right hidden md:block">
                  <div className="flex items-center justify-end space-x-1.5">
                    <span className="text-xs font-bold text-slate-900">
                      {userSession.name}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                        userSession.role === "ADMIN"
                          ? "bg-purple-100 text-purple-800 border border-purple-200"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {userSession.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {userSession.email}
                  </p>
                </div>

                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-semibold border border-slate-200 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
