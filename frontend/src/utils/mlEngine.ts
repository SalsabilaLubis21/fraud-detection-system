import {
  MLIndicators,
  Transaction,
  TransactionStatus,
  TransactionType,
} from "../types";

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function evaluateTransactionRisk(
  type: TransactionType,
  amount: number,
  currentBalance: number,
  recipientAccount?: string,
): {
  riskScore: number;
  status: TransactionStatus;
  mlIndicators: MLIndicators;
  blockedReason?: string;
} {
  const isDeposit = type === "CASH_IN";
  const isBalanceEmptied = !isDeposit && amount >= currentBalance * 0.9;
  const balanceErrorAmount =
    !isDeposit && amount > currentBalance ? amount - currentBalance : 0;
  const balanceErrorAnomaly = !isDeposit && amount > currentBalance;

  // XGBoost simulated weights based on Kaggle PaySim / Banking Fraud Detection dataset features
  let riskScore = 3.5; // Base baseline risk

  if (isBalanceEmptied) {
    riskScore += 65.0;
  }

  if (type === "CASH_OUT") {
    riskScore += 8.5;
    if (isBalanceEmptied) {
      riskScore += 16.0; // Cumulative risk for CASH_OUT draining account
    }
  } else if (type === "DEBIT") {
    riskScore += 5.0;
    if (isBalanceEmptied) {
      riskScore += 12.0;
    }
  } else if (type === "PAYMENT") {
    riskScore += 3.0;
    if (isBalanceEmptied) {
      riskScore += 10.0;
    }
  } else if (type === "CASH_IN") {
    riskScore = 1.5; // Deposits are low risk baseline
    if (amount >= 10000) {
      riskScore += 15.0; // High cash deposit AML review flag
    }
  }

  if (!isDeposit && amount >= 2000) {
    riskScore += 12.5;
  }

  if (balanceErrorAnomaly) {
    riskScore += 25.0;
  }

  // Recipient check for transfers / payments
  let destAccountRisk: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  if (recipientAccount) {
    if (recipientAccount.endsWith("999") || recipientAccount.includes("888")) {
      destAccountRisk = "HIGH";
      riskScore += 18.0;
    } else if (recipientAccount.length < 8) {
      destAccountRisk = "MEDIUM";
      riskScore += 7.5;
    }
  }

  // Bound risk score between 1.2% and 98.9%
  const finalRiskScore = Math.min(
    Math.max(parseFloat(riskScore.toFixed(2)), 1.2),
    98.9,
  );

  const isBlocked = finalRiskScore >= 50.0;
  const status: TransactionStatus = isBlocked ? "BLOCKED" : "APPROVED";

  let blockedReason: string | undefined;
  if (isBlocked) {
    if (isBalanceEmptied) {
      blockedReason =
        "ML System Detection: Account Drained Indicator (isBalanceEmptied) Exceptionally High.";
    } else if (balanceErrorAnomaly) {
      blockedReason =
        "ML System Detection: Withdrawal Exceeds Total Account Balance (Balance Error Anomaly).";
    } else {
      blockedReason =
        "ML System Detection: XGBoost Risk Score Exceeds 50% Security Threshold.";
    }
  }

  return {
    riskScore: finalRiskScore,
    status,
    mlIndicators: {
      isBalanceEmptied,
      balanceErrorAnomaly,
      balanceErrorAmount,
      stepDeltaRatio: isBalanceEmptied ? 0.98 : isDeposit ? 0.05 : 0.12,
      destAccountRisk,
      ipLocationMismatch: isBlocked && amount > 1500,
    },
    blockedReason,
  };
}
