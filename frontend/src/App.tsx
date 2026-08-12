/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  CustomerAccount,
  Transaction,
  TransactionType,
  UserSession,
} from "./types";
import { evaluateTransactionRisk } from "./utils/mlEngine";
import { Header } from "./components/Header";
import { CustomerPortal } from "./components/CustomerPortal";
import { AdminPortal } from "./components/AdminPortal";
import { LoginScreen } from "./components/LoginScreen";

export default function App() {
  const [userSession, setUserSession] = useState<UserSession | null>(null);

  const [activePortal, setActivePortal] = useState<"customer" | "admin">(
    "customer",
  );

  const handleLogin = (session: UserSession) => {
    setUserSession(session);
    if (session.role === "ADMIN") {
      setActivePortal("admin");
    } else {
      setActivePortal("customer");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const userId = localStorage.getItem("user_id");
    const role = localStorage.getItem("role");
    const name = localStorage.getItem("name");
    const email = localStorage.getItem("email");

    if (token && userId && role && name && email) {
      handleLogin({
        isLoggedIn: true,
        user_id: parseInt(userId, 10),
        role: role as "CUSTOMER" | "ADMIN",
        name: name,
        email: email,
      });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    localStorage.removeItem("email");
    setUserSession(null);
  };

  // Customer Account State
  const [account, setAccount] = useState<CustomerAccount>({
    name: "Budi Santoso",
    account_number: "1029-3847-5612",
    balance: 2500, // $2,500 USD initial balance
  });

  // Global Transaction Store (Shared across Customer & Admin Command Center)
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      // Penjagaan Ketat: Jangan lakukan apa pun jika tidak ada sesi yang valid.
      if (!userSession || !userSession.isLoggedIn || !userSession.user_id) {
        setTransactions([]); // Pastikan data lama dibersihkan saat logout
        return;
      }

      const token = localStorage.getItem("access_token");
      if (!token) {
        console.error("Authentication token not found.");
        return;
      }

      try {
        const response = await fetch(
          `/api/transactions?user_id=${userSession.user_id}`, // Sekarang user_id dijamin ada
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (!response.ok) {
          throw new Error("Failed to fetch transactions");
        }
        const data = await response.json();
        setTransactions(data);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      }
    };

    fetchTransactions();
  }, [userSession]);

  const blockedCount = transactions.filter(
    (t) => t.status === "BLOCKED",
  ).length;

  if (!userSession || !userSession.isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-[#1E3A8A]">
      {/* Global Top Header & Navigation Switcher */}
      <Header
        activePortal={activePortal}
        setActivePortal={setActivePortal}
        blockedCount={blockedCount}
        userSession={userSession}
        onLogout={handleLogout}
      />

      {/* Main Portal View */}
      <main className="pb-16">
        {activePortal === "customer" ? <CustomerPortal /> : <AdminPortal />}
      </main>

      {/* Footer Branding */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-2">
          <p>
            © 2026 AmanBank Fraud Guard. Enterprise Retail &amp; ML Security
            System.
          </p>
        </div>
      </footer>
    </div>
  );
}
