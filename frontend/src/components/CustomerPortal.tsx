import React, { useState, useEffect } from "react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  PlusCircle,
  CreditCard,
  Building2,
  Lock,
  RefreshCw,
  AlertOctagon,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  User,
} from "lucide-react";
import { Transaction, TransactionType } from "../types";
import { formatUSD } from "../utils/mlEngine";

interface CustomerPortalProps {}

// Definisikan tipe untuk profil pengguna
interface UserProfile {
  user_id: number;
  full_name: string;
  account_number: string;
  balance: number;
}

export const CustomerPortal: React.FC = () => {
  const [customerTransactions, setCustomerTransactions] = useState<
    Transaction[]
  >([]);
  // State untuk menyimpan profil pengguna dari backend
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [txType, setTxType] = useState<TransactionType>("CASH_OUT");
  const [amountInput, setAmountInput] = useState<string>("");
  const [recipientAccount, setRecipientAccount] = useState<string>("");
  const [recipientName, setRecipientName] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastProcessedTx, setLastProcessedTx] = useState<{
    transaction: Transaction;
    isApproved: boolean;
  } | null>(null);

  const fetchCustomerTransactions = async () => {
    try {
      const userId = localStorage.getItem("user_id");
      const token = localStorage.getItem("access_token");
      if (!userId || !token) return;

      const response = await fetch(
        `http://127.0.0.1:8000/api/users/${userId}/transactions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!response.ok) {
        throw new Error("Gagal mengambil riwayat transaksi.");
      }
      const data = await response.json();
      setCustomerTransactions(data);
    } catch (error) {
      console.error(error);
    }
  };

  // useEffect untuk mengambil data profil pengguna saat komponen dimuat
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userId = localStorage.getItem("user_id");
        const token = localStorage.getItem("access_token");

        if (!userId || userId === "null" || !token) {
          throw new Error("Anda harus login terlebih dahulu.");
        }

        const response = await fetch(
          `http://127.0.0.1:8000/api/users/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error("Gagal mengambil data profil pengguna.");
        }

        const data: UserProfile = await response.json();
        setUserProfile(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
    fetchCustomerTransactions();
  }, []); // Array dependensi kosong agar hanya berjalan sekali

  const numericAmount = parseFloat(amountInput.replace(/[^0-9.]/g, "")) || 0;
  const isAmountInvalid = !!(
    userProfile &&
    numericAmount > userProfile.balance &&
    txType !== "CASH_IN"
  );

  const handlePresetSelect = (val: number) => {
    setAmountInput(val.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount <= 0 || !userProfile) return;

    setIsProcessing(true);
    setLastProcessedTx(null);

    // Default placeholder details based on transaction type if omitted
    let defaultAccount = recipientAccount;
    let defaultName = recipientName;

    if (txType === "TRANSFER") {
      defaultAccount = recipientAccount || "9021-8842-1002";
      defaultName = recipientName || "Global Merchant Inc";
    } else if (txType === "PAYMENT") {
      defaultAccount = recipientAccount || "PAY-BILL-1092";
      defaultName = recipientName || "PLN / State Electric Utility";
    } else if (txType === "DEBIT") {
      defaultName = recipientName || "Supermarket POS #204";
    } else if (txType === "CASH_IN") {
      defaultName = recipientName || "Cash Deposit ATM Machine #102";
    } else if (txType === "CASH_OUT") {
      defaultName = recipientName || "AmanBank ATM Cash Out #008";
    }

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch("http://127.0.0.1:8000/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: userProfile.user_id, // Menggunakan user_id dari state
          type: txType,
          amount: numericAmount,
          dest_account_number: defaultAccount,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Transaksi gagal");
      }

      // Buat objek transaksi baru dari hasil untuk ditampilkan di banner
      const newTransaction: Transaction = {
        transaction_id: result.transaction_id, // Asumsi backend mengembalikan ID
        user_id: userProfile.user_id,
        customer_name: userProfile.full_name,
        account_number: userProfile.account_number,
        type: txType,
        amount: numericAmount,
        status: result.status,
        created_at: new Date().toISOString(), // Gunakan waktu saat ini sebagai perkiraan
        // Isi properti lain jika ada dari response
        risk_score: result.fraud_probability,
        isBalanceEmptied: result.isBalanceEmptied,
        blockedReason: result.message,
        // ...properti lain
      };

      setLastProcessedTx({
        transaction: newTransaction,
        isApproved: result.status === "APPROVED",
      });

      // Selalu panggil fetchCustomerTransactions setelah setiap percobaan transaksi
      // untuk memperbarui log, baik berhasil maupun gagal.
      await fetchCustomerTransactions();

      // Update saldo di frontend HANYA jika transaksi disetujui
      if (result.status === "APPROVED") {
        setUserProfile((prev) =>
          prev ? { ...prev, balance: result.remaining_balance } : null,
        );
        // Reset form hanya jika berhasil
        setAmountInput("");
        setRecipientAccount("");
        setRecipientName("");
      }
    } catch (error) {
      console.error("Transaction Error:", error);
      // Di sini kita juga bisa memanggil fetchCustomerTransactions jika diperlukan,
      // tergantung pada apakah transaksi gagal tercatat di backend atau tidak.
      // Untuk saat ini, kita asumsikan error total tidak membuat log baru.
    } finally {
      setIsProcessing(false);
    }
  };

  const getTxTypeLabel = (type: TransactionType) => {
    switch (type) {
      case "CASH_OUT":
        return "Cash Withdrawal";
      case "TRANSFER":
        return "Fund Transfer";
      case "PAYMENT":
        return "Bill Payment";
      case "CASH_IN":
        return "Cash Deposit / Top-Up";
      case "DEBIT":
        return "Debit Card Transaction";
    }
  };

  // Tampilan Loading dan Error
  if (isLoading) {
    return <div className="text-center p-10">Memuat data pengguna...</div>;
  }

  if (error) {
    return <div className="text-center p-10 text-red-600">Error: {error}</div>;
  }

  if (!userProfile) {
    return (
      <div className="text-center p-10">Gagal memuat profil pengguna.</div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* 1. Header & Account Balance Section */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-slate-500 text-sm font-medium mb-1">
              <span>Priority Customer Service</span>
              <span>•</span>
              <span className="flex items-center text-emerald-600 font-semibold text-xs bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <Lock className="w-3 h-3 mr-1" /> Protected by XGBoost Guard
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome, {userProfile.full_name}
            </h1>
            <p className="text-slate-600 text-sm font-mono mt-1 flex items-center">
              <CreditCard className="w-4 h-4 mr-1.5 text-[#1E3A8A]" />
              Account:{" "}
              <span className="font-semibold text-slate-800 ml-1">
                {userProfile.account_number}
              </span>
            </p>
          </div>

          {/* Balance Card */}
          <div
            id="balance-card"
            className="bg-gradient-to-br from-[#1E3A8A] to-[#1e293b] text-white p-6 rounded-2xl shadow-md min-w-[300px] border border-blue-900/30"
          >
            <div className="flex justify-between items-center text-blue-200 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Current Account Balance</span>
              <Wallet className="w-4 h-4 text-blue-300" />
            </div>
            <div className="text-3xl font-black tracking-tight text-white">
              {formatUSD(userProfile.balance)}
            </div>
            <div className="mt-3 pt-3 border-t border-blue-800/60 flex items-center justify-between text-xs text-blue-200">
              <span>
                Account Status:{" "}
                <strong className="text-emerald-400 font-medium">
                  Active / Secure
                </strong>
              </span>
              <span>USD (US Dollar)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Response Banners */}
      {lastProcessedTx && (
        <div
          id="security-banner-container"
          className="transition-all duration-300 animate-in fade-in slide-in-from-top-2"
        >
          {lastProcessedTx.isApproved ? (
            /* Success Alert Card */
            <div
              id="alert-success-card"
              className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-emerald-900 shadow-sm flex items-start space-x-4"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-emerald-950">
                    Transaction Successfully Processed
                  </h3>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                    ID: {lastProcessedTx.transaction.transaction_id}
                  </span>
                </div>
                <p className="text-sm text-emerald-800 mt-1">
                  Transaction{" "}
                  <strong>
                    {getTxTypeLabel(lastProcessedTx.transaction.type)}
                  </strong>{" "}
                  of{" "}
                  <strong className="font-bold">
                    {formatUSD(lastProcessedTx.transaction.amount)}
                  </strong>{" "}
                  has been approved by AmanBank security systems.
                </p>
                <div className="mt-3 flex items-center space-x-4 text-xs font-semibold text-emerald-800 border-t border-emerald-200/80 pt-2.5">
                  <span>Time: {lastProcessedTx.transaction.created_at}</span>
                  <span>•</span>
                  <span>Updated Balance: {formatUSD(userProfile.balance)}</span>
                  <span>•</span>
                  <span>
                    ML Risk Score: {lastProcessedTx.transaction.risk_score}%
                    (Low)
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Fraud Blocked Alert Card */
            <div
              id="alert-fraud-blocked-card"
              className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-950 shadow-sm flex items-start space-x-4"
            >
              <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-bounce">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-rose-950">
                      Transaction Suspended for Your Account Security.
                    </h3>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-rose-200 text-rose-900 border border-rose-300 font-mono">
                    STATUS: BLOCKED
                  </span>
                </div>
                <p className="text-sm text-rose-800 mt-1 font-medium">
                  {lastProcessedTx.transaction.blockedReason ||
                    "XGBoost Fraud Detection system identified indicators of potential fraud or abnormal transaction activity."}
                </p>

                <div className="mt-4 p-3 rounded-xl bg-white/80 border border-rose-200/80 text-xs text-rose-900 space-y-1.5">
                  <div className="flex justify-between font-semibold">
                    <span>Requested Amount:</span>
                    <span className="font-bold text-rose-700">
                      {formatUSD(lastProcessedTx.transaction.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>XGBoost Risk Score:</span>
                    <span className="font-bold text-rose-700 font-mono">
                      {lastProcessedTx.transaction.risk_score}% (Safety
                      Threshold &lt; 50%)
                    </span>
                  </div>
                  {lastProcessedTx.transaction.isBalanceEmptied && (
                    <div className="flex justify-between">
                      <span>Suspicious Activity (Empties Account):</span>
                      <span className="font-bold text-rose-700">
                        DETECTED (Yes)
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-rose-700">
                  <span>
                    Your funds remain safe in your account. Requires Admin
                    Security team verification.
                  </span>
                  <span className="font-semibold text-rose-900">
                    Ref: {lastProcessedTx.transaction.transaction_id}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Transaction Form Card & Presets */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Customer Transaction Form
            </h2>
            <p className="text-xs text-slate-500">
              Select transaction type and enter amount to process with ML risk
              assessment
            </p>
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>256-Bit TLS Encryption</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Segmented 5-Option Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Transaction Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                id="tab-cash-out"
                onClick={() => setTxType("CASH_OUT")}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg text-xs font-bold transition-all text-center ${
                  txType === "CASH_OUT"
                    ? "bg-white text-[#1E3A8A] shadow-sm border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-emerald-600 mb-1" />
                <span>CASH_OUT</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Cash Withdrawal
                </span>
              </button>

              <button
                type="button"
                id="tab-transfer"
                onClick={() => setTxType("TRANSFER")}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg text-xs font-bold transition-all text-center ${
                  txType === "TRANSFER"
                    ? "bg-white text-[#1E3A8A] shadow-sm border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-blue-600 mb-1" />
                <span>TRANSFER</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Money Transfer
                </span>
              </button>

              <button
                type="button"
                id="tab-payment"
                onClick={() => setTxType("PAYMENT")}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg text-xs font-bold transition-all text-center ${
                  txType === "PAYMENT"
                    ? "bg-white text-[#1E3A8A] shadow-sm border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Receipt className="w-4 h-4 text-purple-600 mb-1" />
                <span>PAYMENT</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Bill Payment
                </span>
              </button>

              <button
                type="button"
                id="tab-cash-in"
                onClick={() => setTxType("CASH_IN")}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg text-xs font-bold transition-all text-center ${
                  txType === "CASH_IN"
                    ? "bg-white text-[#1E3A8A] shadow-sm border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <PlusCircle className="w-4 h-4 text-emerald-600 mb-1" />
                <span>CASH_IN</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Cash Deposit
                </span>
              </button>

              <button
                type="button"
                id="tab-debit"
                onClick={() => setTxType("DEBIT")}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg text-xs font-bold transition-all text-center col-span-2 sm:col-span-1 ${
                  txType === "DEBIT"
                    ? "bg-white text-[#1E3A8A] shadow-sm border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ShoppingBag className="w-4 h-4 text-indigo-600 mb-1" />
                <span>DEBIT</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Debit Card
                </span>
              </button>
            </div>
          </div>

          {/* Additional Dynamic Fields per Transaction Type */}
          {txType === "TRANSFER" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recipient Account Number (Nomor Rekening Tujuan)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9081-2231-1102"
                  value={recipientAccount}
                  onChange={(e) => setRecipientAccount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recipient Name (Nama Penerima)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corporation"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                />
              </div>
            </div>
          )}

          {txType === "PAYMENT" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Biller / Customer ID (ID Pelanggan / Tagihan)
                </label>
                <input
                  type="text"
                  placeholder="e.g. PAY-BILL-5541"
                  value={recipientAccount}
                  onChange={(e) => setRecipientAccount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Merchant / Biller Name (Nama Penyedia Layanan)
                </label>
                <input
                  type="text"
                  placeholder="e.g. PLN Listrik / Water Utility / E-Commerce"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
                />
              </div>
            </div>
          )}

          {txType === "DEBIT" && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Merchant POS Terminal Name (Nama Toko / Mesin EDC)
              </label>
              <input
                type="text"
                placeholder="e.g. Supermarket POS #102 - Mega Mall"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              />
            </div>
          )}

          {txType === "CASH_IN" && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Deposit Location / Terminal ID (Lokasi Setor Tunai / ATM)
              </label>
              <input
                type="text"
                placeholder="e.g. Cash Deposit Machine #08 - Branch Office"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              />
            </div>
          )}

          {/* Amount Input */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-bold text-slate-800">
                {txType === "CASH_IN"
                  ? "Deposit Amount ($)"
                  : "Transaction Amount ($)"}
              </label>
              <span className="text-xs text-slate-500">
                {txType === "CASH_IN"
                  ? "Current Balance: "
                  : "Maximum Available: "}
                {formatUSD(userProfile.balance)}
              </span>
            </div>

            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 font-bold text-lg">
                $
              </span>
              <input
                id="input-transaction-amount"
                type="number"
                placeholder="0"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full pl-10 pr-4 py-3.5 text-xl font-bold bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent transition-all shadow-inner"
              />
              {isAmountInvalid && (
                <p className="text-sm text-red-600 mt-1">
                  The amount exceeds your current balance.
                </p>
              )}
            </div>

            {/* Quick Helper Presets */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 mr-1">
                Preset Amounts:
              </span>
              <button
                type="button"
                onClick={() => handlePresetSelect(100)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
              >
                $100 (Safe)
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect(500)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
              >
                $500
              </button>
              <button
                type="button"
                onClick={() => handlePresetSelect(1000)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
              >
                $1,000
              </button>
              {txType !== "CASH_IN" && (
                <button
                  type="button"
                  onClick={() => handlePresetSelect(userProfile.balance)}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 transition-colors flex items-center space-x-1"
                  title="Fraud Test Trigger: Attempting 100% Account Drain"
                >
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                  <span>
                    {formatUSD(userProfile.balance)} (Drain Account / Fraud
                    Test)
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="submit"
            id="btn-process-transaction"
            disabled={isProcessing || numericAmount <= 0 || isAmountInvalid}
            className="w-full py-4 px-6 rounded-xl font-bold text-base text-white bg-[#1E3A8A] hover:bg-blue-900 focus:outline-none focus:ring-4 focus:ring-blue-200 shadow-md transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Analyzing ML Model Risk...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>Process Transaction ({txType})</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Customer Session Transaction Log */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center justify-between">
          <span>Recent Session Transactions Log</span>
          <span className="text-xs text-slate-400 font-normal">
            Live Stream Monitoring Connected
          </span>
        </h3>

        {customerTransactions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            No transactions recorded in this session yet. Submit a transaction
            above.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {customerTransactions.map((tx) => (
              <div
                key={tx.transaction_id}
                className="py-3 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      tx.status === "APPROVED" || tx.status === "OVERRIDDEN"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {tx.type === "CASH_OUT" && (
                      <ArrowDownRight className="w-5 h-5" />
                    )}
                    {tx.type === "TRANSFER" && (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                    {tx.type === "PAYMENT" && <Receipt className="w-5 h-5" />}
                    {tx.type === "CASH_IN" && (
                      <PlusCircle className="w-5 h-5 text-emerald-600" />
                    )}
                    {tx.type === "DEBIT" && <ShoppingBag className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-slate-900">
                        {tx.type === "CASH_OUT" && "Cash Withdrawal"}
                        {tx.type === "TRANSFER" &&
                          `Transfer to ${tx.dest_account_number || "-"}`}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        ({tx.transaction_id})
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {tx.created_at}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-sm font-extrabold ${tx.type === "CASH_IN" ? "text-emerald-700" : "text-slate-900"}`}
                  >
                    {tx.type === "CASH_IN" ? "+" : "-"}
                    {formatUSD(tx.amount)}
                  </div>
                  <span
                    className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md mt-0.5 ${
                      tx.status === "APPROVED"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : tx.status === "OVERRIDDEN"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {tx.status === "APPROVED"
                      ? "Approved"
                      : tx.status === "OVERRIDDEN"
                        ? "Admin Overridden"
                        : "Suspended (Fraud)"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
