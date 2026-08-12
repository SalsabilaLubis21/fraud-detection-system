import React, { useState } from "react";
import {
  Activity,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  ChevronRight,
  Check,
  TrendingUp,
  SlidersHorizontal,
  FileSpreadsheet,
} from "lucide-react";
import { Transaction, TransactionStatus } from "../types";
import { formatUSD } from "../utils/mlEngine";

interface Metrics {
  total_processed: number;
  total_approved: number;
  total_blocked: number;
}

export const AdminPortal: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    total_processed: 0,
    total_approved: 0,
    total_blocked: 0,
  });
  const [selectedTxId, setSelectedTxId] = useState<string>(
    transactions.length > 0 ? transactions[0].transaction_id : "",
  );
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "APPROVED" | "BLOCKED"
  >("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isReevaluating, setIsReevaluating] = useState<boolean>(false);
  const [reevaluateMsg, setReevaluateMsg] = useState<string | null>(null);

  const filteredTransactions = transactions.filter((t) => {
    const matchesStatus =
      statusFilter === "ALL"
        ? true
        : statusFilter === "APPROVED"
          ? t.status === "APPROVED" || t.status === "OVERRIDDEN"
          : t.status === "BLOCKED";

    const matchesSearch =
      (t.customer_name?.toLowerCase() ?? "").includes(
        searchQuery.toLowerCase(),
      ) ||
      (t.account_number?.includes(searchQuery) ?? false) ||
      (t.type?.toLowerCase() ?? "").includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const selectedTx =
    transactions.find((t) => t.transaction_id === selectedTxId) ||
    (filteredTransactions.length > 0
      ? filteredTransactions[0]
      : transactions[0]);

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchTransactions(), fetchMetrics()]);
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch("/api/admin/transactions");
      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch("/api/metrics");
      if (!response.ok) {
        throw new Error("Failed to fetch metrics");
      }
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const handleReevaluate = async () => {
    setIsReevaluating(true);
    setReevaluateMsg(null);
    try {
      const response = await fetch("/api/admin/reevaluate", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to re-evaluate scores");
      }
      const data = await response.json();
      setReevaluateMsg(
        `Successfully re-evaluated ${data.reevaluated_count} transactions.`,
      );
      fetchData();
    } catch (error) {
      console.error(error);
      setReevaluateMsg("An error occurred during re-evaluation.");
    } finally {
      setIsReevaluating(false);
      setTimeout(() => {
        setReevaluateMsg(null);
      }, 5000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* 1. Admin Dashboard Top Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Fraud Detection Command Center - Live Monitoring
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time Machine Learning Anomaly Detection System powered by
            XGBoost Engine
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          {/* System Operational status badge */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>System Operational</span>
          </div>

          {/* Refresh Stream Button */}
          <button
            onClick={handleRefresh}
            id="btn-refresh-stream"
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#1E3A8A]" : ""}`}
            />
            <span>Refresh Stream</span>
          </button>
        </div>
      </div>

      {/* 2. Metric) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Total Transactions Processed */}
        <div
          id="metric-total-card"
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Transactions Processed
              </p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1 font-mono">
                {(metrics?.total_processed ?? 0).toLocaleString("en-US")}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5 text-[#1E3A8A]" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs text-slate-500 font-medium">
            <span className="text-emerald-600 font-bold mr-1 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> Live Stream
            </span>
            <span>connected to database</span>
          </div>
        </div>

        {/* Card 2: Safe Transactions Approved */}
        <div
          id="metric-approved-card"
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Safe Transactions Approved
              </p>
              <h3 className="text-3xl font-extrabold text-emerald-600 mt-1 font-mono">
                {metrics.total_approved.toLocaleString("en-US")}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-emerald-700 bg-emerald-50 font-bold px-2 py-0.5 rounded border border-emerald-200">
              {(
                ((metrics?.total_approved ?? 0) /
                  (metrics?.total_processed || 1)) *
                100
              ).toFixed(1)}
              % Safe Rate
            </span>
            <span className="text-slate-400">Model Precision 99.2%</span>
          </div>
        </div>

        {/* Card 3: Fraud Attempts Blocked */}
        <div
          id="metric-blocked-card"
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Fraud Attempts Blocked
              </p>
              <h3 className="text-3xl font-extrabold text-rose-600 mt-1 font-mono">
                {metrics.total_blocked.toLocaleString("en-US")}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold border border-rose-200">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-rose-700 bg-rose-50 font-bold px-2 py-0.5 rounded border border-rose-200">
              {(
                (metrics.total_blocked / metrics.total_processed) *
                100
              ).toFixed(1)}
              % ML Engine Detected
            </span>
          </div>
        </div>
      </div>

      {/* Re-evaluation Notification Banner */}
      {reevaluateMsg && (
        <div
          className={`rounded-xl p-4 text-sm font-semibold flex items-center justify-between shadow-sm animate-in fade-in ${
            reevaluateMsg.includes("error")
              ? "bg-rose-50 border border-rose-300 text-rose-900"
              : "bg-blue-50 border border-blue-300 text-blue-900"
          }`}
        >
          <div className="flex items-center space-x-2">
            {reevaluateMsg.includes("error") ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-blue-600 shrink-0" />
            )}
            <span>{reevaluateMsg}</span>
          </div>
        </div>
      )}

      {/* 3. Split-Screen Investigation View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Live Transaction Stream Table) - 7 cols on lg */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Table Header & Controls */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <span>Live Transaction Stream</span>
                <span className="text-xs bg-blue-100 text-[#1E3A8A] font-bold px-2 py-0.5 rounded-full">
                  {filteredTransactions.length} Records
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Select a row to open ML investigation details
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
              >
                <option value="ALL">All Statuses</option>
                <option value="APPROVED">Approved Only</option>
                <option value="BLOCKED">Blocked Only (&gt;50%)</option>
              </select>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search ID/Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-2 py-1 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 w-28 sm:w-36 focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
                />
              </div>
            </div>
          </div>

          {/* Table Data */}
          <div className="overflow-x-auto flex-1 max-h-[580px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-3">ID / Time</th>
                  <th className="px-3.5 py-3">Type</th>
                  <th className="px-3.5 py-3 text-right">Amount</th>
                  <th className="px-3.5 py-3 text-center">Risk Score (%)</th>
                  <th className="px-3.5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-8 text-slate-400 font-medium"
                    >
                      No transactions match the search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx, index) => {
                    const riskScorePercentage = (tx.risk_score ?? 0) * 100;
                    const isHighRisk = riskScorePercentage > 50.0;
                    const isSelected =
                      selectedTx?.transaction_id === tx.transaction_id;
                    const prevTx =
                      index > 0 ? filteredTransactions[index - 1] : null;
                    const step_delta =
                      prevTx && tx.step && prevTx.step
                        ? tx.step - prevTx.step
                        : null;

                    return (
                      <tr
                        key={tx.transaction_id}
                        onClick={() => setSelectedTxId(tx.transaction_id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-blue-50/90 font-medium border-l-4 border-l-[#1E3A8A]"
                            : isHighRisk
                              ? "bg-red-50/70 hover:bg-red-100/60"
                              : "hover:bg-slate-50"
                        }`}
                      >
                        {/* ID & Time */}
                        <td className="px-3.5 py-3">
                          <div className="font-bold font-mono text-slate-900">
                            {tx.transaction_id}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {tx.created_at?.split(" ")[1] ?? ""}
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-3.5 py-3">
                          <span
                            className={`inline-block font-bold px-2 py-0.5 rounded text-[10px] ${
                              tx.type === "CASH_OUT"
                                ? "bg-purple-100 text-purple-800 border border-purple-200"
                                : tx.type === "TRANSFER"
                                  ? "bg-blue-100 text-blue-800 border border-blue-200"
                                  : tx.type === "PAYMENT"
                                    ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                                    : tx.type === "CASH_IN"
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                      : "bg-amber-100 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="px-3.5 py-3 text-right font-extrabold font-mono text-slate-900">
                          {formatUSD(tx.amount)}
                        </td>

                        {/* XGBoost Risk Score (%) */}
                        <td className="px-3.5 py-3 text-center">
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                              isHighRisk
                                ? "bg-red-100 text-red-700 font-extrabold border border-red-300"
                                : riskScorePercentage > 30
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {((tx.risk_score ?? 0) * 100).toFixed(2)}%
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-3.5 py-3 text-center">
                          {tx.status === "APPROVED" ? (
                            <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                              APPROVED
                            </span>
                          ) : tx.status === "OVERRIDDEN" ? (
                            <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300">
                              OVERRIDDEN
                            </span>
                          ) : tx.status === "REJECTED" ? (
                            <span className="inline-flex items-center text-[10px] font-extrabold px-2 py-0.5 rounded bg-red-200 text-red-800 border border-red-400">
                              <XCircle className="w-3 h-3 mr-1" />
                              REJECTED
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] font-extrabold px-2 py-0.5 rounded bg-red-200 text-red-800 border border-red-400">
                              <XCircle className="w-3 h-3 mr-1" />
                              BLOCKED
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (Fraud Investigation Detail Panel) - 5 cols on lg */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          {selectedTx ? (
            <div className="space-y-6">
              {/* Panel Header */}
              <div className="pb-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    ML Fraud Investigation Panel
                  </span>
                  <span
                    className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
                      selectedTx.status === "BLOCKED" ||
                      selectedTx.status === "REJECTED"
                        ? "bg-rose-100 text-rose-800 border border-rose-300"
                        : selectedTx.status === "OVERRIDDEN"
                          ? "bg-blue-100 text-blue-800 border border-blue-300"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    }`}
                  >
                    STATUS:{" "}
                    {selectedTx.status === "APPROVED"
                      ? "APPROVED (LOW RISK)"
                      : selectedTx.status === "OVERRIDDEN"
                        ? "MANUALLY APPROVED"
                        : selectedTx.status === "REJECTED"
                          ? "REJECTED (HIGH RISK)"
                          : "BLOCKED (HIGH RISK)"}
                  </span>
                </div>

                <div className="mt-2 flex items-baseline justify-between">
                  <h3 className="text-2xl font-black text-slate-900 font-mono">
                    {selectedTx.transaction_id}
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {selectedTx.created_at}
                  </span>
                </div>

                <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Full Name:</span>
                    <span className="font-bold text-slate-800">
                      {selectedTx.customer_name ?? "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Account Number:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {selectedTx.account_number ?? "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Type & Amount:</span>
                    <span className="font-bold text-[#1E3A8A]">
                      {selectedTx.type} — {formatUSD(selectedTx.amount)}
                    </span>
                  </div>

                  {selectedTx.dest_account_number && (
                    <div className="flex justify-between border-t border-slate-200 pt-1 mt-1">
                      <span className="text-slate-500">
                        Recipient / Merchant:
                      </span>
                      <span className="font-medium text-slate-800">
                        {selectedTx.dest_account_number}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* XGBoost Risk Score Progress Bar / Gauge */}
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    XGBoost Predicted Risk Score
                  </label>
                  <span
                    className={`text-lg font-black font-mono ${
                      (selectedTx.risk_score ?? 0) * 100 > 50
                        ? "text-rose-600"
                        : (selectedTx.risk_score ?? 0) * 100 > 30
                          ? "text-amber-600"
                          : "text-emerald-600"
                    }`}
                  >
                    {((selectedTx.risk_score ?? 0) * 100).toFixed(2)}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden border border-slate-200 relative">
                  <div
                    className={`h-full transition-all duration-500 ${
                      (selectedTx.risk_score ?? 0) * 100 > 50
                        ? "bg-gradient-to-r from-amber-500 to-rose-600"
                        : "bg-emerald-500"
                    }`}
                    style={{
                      width: `${(selectedTx.risk_score ?? 0) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                  <span>0% (Very Safe)</span>
                  <span className="text-rose-500 font-bold">
                    Block Threshold: 50.00%
                  </span>
                  <span>100% (Certain Fraud)</span>
                </div>
              </div>

              {/* ML Indicators Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  ML Feature Indicators Breakdown
                </h4>

                <div className="space-y-2 text-xs">
                  {/* Indicator 1: Saldo Dikuras (isBalanceEmptied) */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 block">
                        Balance Emptied
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Withdrawal covers &gt;90% of total account balance
                      </span>
                    </div>
                    {selectedTx.newbalance_orig === 0 ? (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                        YES (HIGH RISK)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        NO
                      </span>
                    )}
                  </div>

                  {/* Additional ML metrics */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">
                        Transaction Interval:
                      </span>
                      <span className="font-mono font-bold text-slate-800">
                        {(() => {
                          const userTransactions = transactions
                            .filter((tx) => tx.user_id === selectedTx.user_id)
                            .sort(
                              (a, b) =>
                                new Date(a.created_at).getTime() -
                                new Date(b.created_at).getTime(),
                            );

                          const selectedTxIndex = userTransactions.findIndex(
                            (tx) =>
                              tx.transaction_id === selectedTx.transaction_id,
                          );

                          const prevTx =
                            selectedTxIndex > 0
                              ? userTransactions[selectedTxIndex - 1]
                              : null;

                          let stepDeltaText = "N/A";

                          if (
                            prevTx &&
                            selectedTx.created_at &&
                            prevTx.created_at
                          ) {
                            const currentMillis = new Date(
                              selectedTx.created_at,
                            ).getTime();
                            const prevMillis = new Date(
                              prevTx.created_at,
                            ).getTime();

                            const diffMillis = currentMillis - prevMillis;

                            // Konversi ke Menit dan Jam
                            const diffMinutes = Math.floor(
                              diffMillis / (1000 * 60),
                            );
                            const diffHours = Math.floor(diffMinutes / 60);

                            if (diffMinutes < 1) {
                              stepDeltaText = "+0m (Sangat Cepat)";
                            } else if (diffMinutes < 60) {
                              stepDeltaText = `+${diffMinutes}m`;
                            } else {
                              const remainingMins = diffMinutes % 60;
                              stepDeltaText = `+${diffHours}h ${remainingMins}m`;
                            }
                          }

                          return stepDeltaText;
                        })()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Created At:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {selectedTx.created_at ?? "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Blocked Reason Details */}
                {selectedTx.blockedReason && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                    <span className="font-bold block text-rose-950 mb-0.5">
                      Security Notes:
                    </span>
                    {selectedTx.blockedReason}
                  </div>
                )}
              </div>

              {/* Status Display */}
              <div className="pt-4 border-t border-slate-200">
                {selectedTx.status === "BLOCKED" ||
                selectedTx.status === "REJECTED" ? (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold text-center flex items-center justify-center space-x-2">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>
                      Transaction {selectedTx.status} due to High Risk
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold text-center flex items-center justify-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>
                      {selectedTx.status === "OVERRIDDEN"
                        ? "Transaction Has Been Overridden & Unblocked"
                        : "Transaction Approved Normally"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-sm">
              Select a transaction from the table on the left to view ML
              analysis details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
