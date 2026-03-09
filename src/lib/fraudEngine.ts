// ===== Types =====

export interface SimpleTransaction {
  accountId: string;
  amount: number;
  timestamp: string;
  city: string;
}

export interface FraudResult {
  accountId: string;
  amount: number;
  timestamp: string;
  city: string;
  ruleReasons: string[];
  flagRating: number;
}

export interface AccountFlag {
  accountId: string;
  reason: string[];
}

// ===== Helpers =====

export function toISOTimestamp(ts: string): string {
  if (!ts) return new Date().toISOString();
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}T/.test(ts)) return ts;
  // "2026-02-19 10:00:00" format
  if (/^\d{4}-\d{2}-\d{2}\s/.test(ts)) return ts.replace(" ", "T");
  // "19/02/2026 10:00:00" format
  const match = ts.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})\s*(.*)$/);
  if (match) {
    const [, dd, mm, yyyy, time] = match;
    return `${yyyy}-${mm}-${dd}T${time || "00:00:00"}`;
  }
  // "02/19/2026" US format
  const match2 = ts.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (match2) {
    const [, mm, dd, yyyy] = match2;
    return `${yyyy}-${mm}-${dd}T00:00:00`;
  }
  // Try Date parse as fallback
  const d = new Date(ts);
  if (!isNaN(d.getTime())) return d.toISOString();
  return ts;
}

export function isSimpleFormat(data: any[]): boolean {
  if (!data.length) return false;
  const first = data[0];
  return "accountId" in first && "amount" in first && "timestamp" in first && "city" in first;
}

// ===== CSV Parser =====

export function parseCSV(csv: string): SimpleTransaction[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  // Map common header variations
  const findHeader = (candidates: string[]) =>
    headers.findIndex((h) => candidates.some((c) => h.includes(c)));

  const accountIdx = findHeader(["accountid", "account_id", "account"]);
  const amountIdx = findHeader(["amount", "transactionamount", "transaction_amount"]);
  const timestampIdx = findHeader(["timestamp", "date", "transactiondate", "transaction_date", "time"]);
  const cityIdx = findHeader(["city", "location", "place"]);

  if (accountIdx === -1 || amountIdx === -1) return [];

  return lines.slice(1).filter(l => l.trim()).map((line) => {
    // Handle CSV with quotes
    const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/"/g, '').trim()) || line.split(",").map(v => v.trim());

    return {
      accountId: values[accountIdx] || "UNKNOWN",
      amount: parseFloat(values[amountIdx]) || 0,
      timestamp: toISOTimestamp(values[timestampIdx] || ""),
      city: values[cityIdx] || "Unknown",
    };
  });
}

// ===== Synthetic data generator =====

const CITIES = ["Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata", "Hyderabad", "Pune", "Jaipur", "Lucknow", "Ahmedabad"];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateSyntheticTransactions(count: number, existing: SimpleTransaction[]): SimpleTransaction[] {
  const accountIds = [...new Set(existing.map((t) => t.accountId))];
  if (accountIds.length === 0) accountIds.push("A1", "A2", "A3", "A4", "A5");

  const synth: SimpleTransaction[] = [];
  const baseDate = new Date("2026-02-19T10:00:00");

  for (let i = 0; i < count; i++) {
    const acct = randomFrom(accountIds);
    const offset = Math.floor(Math.random() * 86400 * 30) * 1000;
    const date = new Date(baseDate.getTime() + offset);
    const amount = Math.round((Math.random() * 9990 + 10) * 100) / 100;

    synth.push({
      accountId: acct,
      amount,
      timestamp: date.toISOString(),
      city: randomFrom(CITIES),
    });
  }
  return synth;
}

// ===== Rule-based Fraud Detection =====

export const RULE_NAMES = {
  R1: "High daily transaction amount",
  R2: "Multiple transactions within short time",
  R3: "Transactions from different cities in short duration",
  R4: "Unusually large single transaction",
  R5: "Excessive transactions in short period",
  R6: "Repeated identical transactions",
} as const;

export function runFraudDetection(transactions: SimpleTransaction[]): {
  results: FraudResult[];
  accountFlags: AccountFlag[];
  ruleBreakdown: Record<string, number>;
} {
  const DAILY_LIMIT = 50000;
  const RAPID_TX_COUNT = 3; // more than 3 = 4+
  const RAPID_TX_WINDOW_MS = 60 * 1000; // 1 minute
  const CITY_CHANGE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
  const LARGE_TX_AMOUNT = 40000;
  const EXCESSIVE_TX_COUNT = 10; // more than 10
  const EXCESSIVE_TX_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

  // Group by account
  const accountMap = new Map<string, SimpleTransaction[]>();
  transactions.forEach((tx) => {
    const list = accountMap.get(tx.accountId) || [];
    list.push(tx);
    accountMap.set(tx.accountId, list);
  });

  const allResults: FraudResult[] = [];
  const accountFlags: AccountFlag[] = [];
  const ruleBreakdown: Record<string, number> = {
    [RULE_NAMES.R1]: 0,
    [RULE_NAMES.R2]: 0,
    [RULE_NAMES.R3]: 0,
    [RULE_NAMES.R4]: 0,
    [RULE_NAMES.R5]: 0,
    [RULE_NAMES.R6]: 0,
  };

  accountMap.forEach((txList, accountId) => {
    const sorted = [...txList].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Per-transaction tracking
    const txReasons = new Map<number, Set<string>>();
    sorted.forEach((_, idx) => txReasons.set(idx, new Set()));

    const accountRuleReasons = new Set<string>();

    // Rule 1: High daily transaction amount (total for a day > 50,000)
    const dailyTotals = new Map<string, { total: number; indices: number[] }>();
    sorted.forEach((tx, idx) => {
      const date = tx.timestamp.split("T")[0];
      const entry = dailyTotals.get(date) || { total: 0, indices: [] };
      entry.total += tx.amount;
      entry.indices.push(idx);
      dailyTotals.set(date, entry);
    });
    dailyTotals.forEach((entry) => {
      if (entry.total > DAILY_LIMIT) {
        accountRuleReasons.add(RULE_NAMES.R1);
        entry.indices.forEach((idx) => txReasons.get(idx)!.add(RULE_NAMES.R1));
      }
    });

    // Rule 2: More than 3 transactions within 1 minute
    for (let i = 0; i < sorted.length; i++) {
      const startTime = new Date(sorted[i].timestamp).getTime();
      const windowIndices: number[] = [i];
      for (let j = i + 1; j < sorted.length; j++) {
        const txTime = new Date(sorted[j].timestamp).getTime();
        if (txTime - startTime <= RAPID_TX_WINDOW_MS) {
          windowIndices.push(j);
        } else break;
      }
      if (windowIndices.length > RAPID_TX_COUNT) {
        accountRuleReasons.add(RULE_NAMES.R2);
        windowIndices.forEach((idx) => txReasons.get(idx)!.add(RULE_NAMES.R2));
      }
    }

    // Rule 3: Transactions from different cities within 30-minute window
    for (let i = 0; i < sorted.length; i++) {
      const t1 = new Date(sorted[i].timestamp).getTime();
      for (let j = i + 1; j < sorted.length; j++) {
        const t2 = new Date(sorted[j].timestamp).getTime();
        if (t2 - t1 > CITY_CHANGE_WINDOW_MS) break;
        if (sorted[i].city.toLowerCase() !== sorted[j].city.toLowerCase()) {
          accountRuleReasons.add(RULE_NAMES.R3);
          txReasons.get(i)!.add(RULE_NAMES.R3);
          txReasons.get(j)!.add(RULE_NAMES.R3);
        }
      }
    }

    // Rule 4: Unusually large single transaction (> 40,000)
    sorted.forEach((tx, idx) => {
      if (tx.amount > LARGE_TX_AMOUNT) {
        accountRuleReasons.add(RULE_NAMES.R4);
        txReasons.get(idx)!.add(RULE_NAMES.R4);
      }
    });

    // Rule 5: Excessive transactions in short period (>10 in 10 min)
    for (let i = 0; i < sorted.length; i++) {
      const startTime = new Date(sorted[i].timestamp).getTime();
      const windowIndices: number[] = [i];
      for (let j = i + 1; j < sorted.length; j++) {
        const txTime = new Date(sorted[j].timestamp).getTime();
        if (txTime - startTime <= EXCESSIVE_TX_WINDOW_MS) {
          windowIndices.push(j);
        } else break;
      }
      if (windowIndices.length > EXCESSIVE_TX_COUNT) {
        accountRuleReasons.add(RULE_NAMES.R5);
        windowIndices.forEach((idx) => txReasons.get(idx)!.add(RULE_NAMES.R5));
      }
    }

    // Rule 6: Repeated identical consecutive transactions (same amount)
    let consecutiveCount = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].amount === sorted[i - 1].amount) {
        consecutiveCount++;
        if (consecutiveCount >= 3) {
          accountRuleReasons.add(RULE_NAMES.R6);
          // Mark all consecutive ones
          for (let k = i - consecutiveCount + 1; k <= i; k++) {
            txReasons.get(k)!.add(RULE_NAMES.R6);
          }
        }
      } else {
        consecutiveCount = 1;
      }
    }

    // Build results
    sorted.forEach((tx, idx) => {
      const reasons = Array.from(txReasons.get(idx)!);
      let flagRating = 0;
      if (reasons.length > 0) flagRating = Math.min(100, 20 + reasons.length * 20);

      allResults.push({
        accountId: tx.accountId,
        amount: tx.amount,
        timestamp: tx.timestamp,
        city: tx.city,
        ruleReasons: reasons,
        flagRating,
      });
    });

    // Count rule breakdown
    accountRuleReasons.forEach((r) => {
      ruleBreakdown[r] = (ruleBreakdown[r] || 0) + 1;
    });

    if (accountRuleReasons.size > 0) {
      accountFlags.push({
        accountId,
        reason: Array.from(accountRuleReasons),
      });
    }
  });

  // Sort by account then by date
  allResults.sort((a, b) => {
    if (a.accountId !== b.accountId) return a.accountId.localeCompare(b.accountId);
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });
  accountFlags.sort((a, b) => b.reason.length - a.reason.length);

  return { results: allResults, accountFlags, ruleBreakdown };
}
