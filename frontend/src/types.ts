export type TransactionType =
  | "CASH_OUT"
  | "TRANSFER"
  | "PAYMENT"
  | "CASH_IN"
  | "DEBIT";
export type TransactionStatus =
  | "APPROVED"
  | "BLOCKED"
  | "REJECTED"
  | "OVERRIDDEN";
export type UserRole = "CUSTOMER" | "ADMIN";

export interface UserSession {
  user_id: number;
  email: string;
  name: string;
  role: UserRole;
  isLoggedIn: boolean;
}

export interface MLIndicators {
  isBalanceEmptied: boolean;
  balanceErrorAnomaly: boolean;
  balanceErrorAmount: number;
  stepDeltaRatio: number;
  destAccountRisk: "LOW" | "MEDIUM" | "HIGH";
  ipLocationMismatch?: boolean;
}

export interface Transaction {
  transaction_id: string;
  user_id: number;
  created_at: string;
  customer_name: string;
  account_number: string;
  type: TransactionType;
  amount: number;
  risk_score: number;
  status: TransactionStatus;
  blockedReason?: string;
  dest_account_number?: string;
  oldbalance_org?: number;
  newbalance_orig?: number;
  is_fraud?: number;
  step?: number;
  isBalanceEmptied?: boolean;
}

export interface CustomerAccount {
  name: string;
  account_number: string;
  balance: number;
}
