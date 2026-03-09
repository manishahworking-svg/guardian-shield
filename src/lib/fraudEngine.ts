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
}

export interface AccountFlag {
  accountId: string;
  reason: string[];
}

// ===== Helpers =====

export function toISOTimestamp(ts: string): string {
  if (!ts) return new Date().toISOString();
  if (/^\d{4}-\d{2}-\d{2}T/.test(ts)) return ts;
  if (/^\d{4}-\d{2}-\d{2}\s/.test(ts)) return ts.replace(" ", "T");
  const match = ts.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})\s*(.*)$/);
  if (match) {
    const [, dd, mm, yyyy, time] = match;
    return `${yyyy}-${mm}-${dd}T${time || "00:00:00"}`;
  }
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

  const findHeader = (candidates: string[]) =>
    headers.findIndex((h) => candidates.some((c) => h.includes(c)));

  const accountIdx = findHeader(["accountid", "account_id", "account"]);
  const amountIdx = findHeader(["amount", "transactionamount", "transaction_amount"]);
  const timestampIdx = findHeader(["timestamp", "date", "transactiondate", "transaction_date", "time"]);
  const cityIdx = findHeader(["city", "location", "place"]);

  if (accountIdx === -1 || amountIdx === -1) return [];

  return lines.slice(1).filter(l => l.trim()).map((line) => {
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
    synth.push({ accountId: acct, amount, timestamp: date.toISOString(), city: randomFrom(CITIES) });
  }
  return synth;
}

// ===== Fraud Detection — 3 Rules Only =====

export const RULE_REASONS = {
  HIGH_DAILY: "High daily transaction amount",
  RAPID_TXN: "Multiple transactions within short time",
  DIFF_CITIES: "Transactions from different cities in short duration",
} as const;

export function runFraudDetection(transactions: SimpleTransaction[]): {
  results: FraudResult[];
  accountFlags: AccountFlag[];
  ruleBreakdown: Record<string, number>;
} {
  const DAILY_LIMIT = 50000;
  const RAPID_TX_WINDOW_MS = 60 * 1000; // 1 minute
  const RAPID_TX_THRESHOLD = 3; // more than 3
  const CITY_CHANGE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

  const accountMap = new Map<string, SimpleTransaction[]>();
  transactions.forEach((tx) => {
    const list = accountMap.get(tx.accountId) || [];
    list.push(tx);
    accountMap.set(tx.accountId, list);
  });

  const allResults: FraudResult[] = [];
  const accountFlags: AccountFlag[] = [];
  const ruleBreakdown: Record<string, number> = {
    [RULE_REASONS.HIGH_DAILY]: 0,
    [RULE_REASONS.RAPID_TXN]: 0,
    [RULE_REASONS.DIFF_CITIES]: 0,
  };

  accountMap.forEach((txList, accountId) => {
    const sorted = [...txList].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const txReasons = new Map<number, Set<string>>();
    sorted.forEach((_, idx) => txReasons.set(idx, new Set()));
    const accountRuleReasons = new Set<string>();

    // Rule 1: Total daily amount > ₹50,000
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
        accountRuleReasons.add(RULE_REASONS.HIGH_DAILY);
        entry.indices.forEach((idx) => txReasons.get(idx)!.add(RULE_REASONS.HIGH_DAILY));
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
      if (windowIndices.length > RAPID_TX_THRESHOLD) {
        accountRuleReasons.add(RULE_REASONS.RAPID_TXN);
        windowIndices.forEach((idx) => txReasons.get(idx)!.add(RULE_REASONS.RAPID_TXN));
      }
    }

    // Rule 3: Different cities within 30-minute window
    for (let i = 0; i < sorted.length; i++) {
      const t1 = new Date(sorted[i].timestamp).getTime();
      for (let j = i + 1; j < sorted.length; j++) {
        const t2 = new Date(sorted[j].timestamp).getTime();
        if (t2 - t1 > CITY_CHANGE_WINDOW_MS) break;
        if (sorted[i].city.trim().toLowerCase() !== sorted[j].city.trim().toLowerCase()) {
          accountRuleReasons.add(RULE_REASONS.DIFF_CITIES);
          txReasons.get(i)!.add(RULE_REASONS.DIFF_CITIES);
          txReasons.get(j)!.add(RULE_REASONS.DIFF_CITIES);
        }
      }
    }

    // Build results
    sorted.forEach((tx, idx) => {
      allResults.push({
        accountId: tx.accountId,
        amount: tx.amount,
        timestamp: tx.timestamp,
        city: tx.city,
        ruleReasons: Array.from(txReasons.get(idx)!),
      });
    });

    accountRuleReasons.forEach((r) => {
      ruleBreakdown[r] = (ruleBreakdown[r] || 0) + 1;
    });

    if (accountRuleReasons.size > 0) {
      accountFlags.push({ accountId, reason: Array.from(accountRuleReasons) });
    }
  });

  allResults.sort((a, b) => {
    if (a.accountId !== b.accountId) return a.accountId.localeCompare(b.accountId);
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });
  accountFlags.sort((a, b) => b.reason.length - a.reason.length);

  return { results: allResults, accountFlags, ruleBreakdown };
}
