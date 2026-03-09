import { useState, useCallback } from "react";
import {
  parseCSV,
  runFraudDetection,
  FraudResult,
  AccountFlag,
  SimpleTransaction,
  isSimpleFormat,
  generateSyntheticTransactions,
  toISOTimestamp,
} from "@/lib/fraudEngine";
import { StatsBar } from "@/components/StatsBar";
import { ResultsTable } from "@/components/ResultsTable";
import { JsonViewer } from "@/components/JsonViewer";
import { InputJsonViewer } from "@/components/InputJsonViewer";
import { AccountFlagsPanel } from "@/components/AccountFlagsPanel";
import { RuleBreakdownChart } from "@/components/RuleBreakdownChart";
import { Shield, Upload, Loader2, Home, Play, Database } from "lucide-react";

const EXAMPLE_DATA: SimpleTransaction[] = [
  { accountId: "A1", amount: 20000, timestamp: "2026-02-19T10:00:00", city: "Delhi" },
  { accountId: "A1", amount: 15000, timestamp: "2026-02-19T10:00:30", city: "Delhi" },
  { accountId: "A1", amount: 20000, timestamp: "2026-02-19T10:01:00", city: "Mumbai" },
];

const Index = () => {
  const [results, setResults] = useState<FraudResult[]>([]);
  const [accountFlags, setAccountFlags] = useState<AccountFlag[]>([]);
  const [ruleBreakdown, setRuleBreakdown] = useState<Record<string, number>>({});
  const [inputJson, setInputJson] = useState<SimpleTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showHome, setShowHome] = useState(true);
  const [activeTab, setActiveTab] = useState<"table" | "json" | "input" | "accounts" | "chart">("table");

  const processData = useCallback((transactions: SimpleTransaction[]) => {
    setLoading(true);
    setInputJson(transactions);
    setShowHome(false);
    setTimeout(() => {
      const { results: r, accountFlags: af, ruleBreakdown: rb } = runFraudDetection(transactions);
      setResults(r);
      setAccountFlags(af);
      setRuleBreakdown(rb);
      setLoading(false);
      setLoaded(true);
    }, 100);
  }, []);

  const parseJsonInput = (data: any[]): SimpleTransaction[] => {
    if (isSimpleFormat(data)) {
      return data.map((d: any) => ({
        accountId: d.accountId,
        amount: parseFloat(d.amount) || 0,
        timestamp: toISOTimestamp(d.timestamp),
        city: d.city,
      }));
    }
    return data.map((d: any) => ({
      accountId: d.accountId || d.AccountID || d.account_id || d.account || "UNKNOWN",
      amount: parseFloat(d.amount || d.TransactionAmount || d.transaction_amount || 0),
      timestamp: toISOTimestamp(d.timestamp || d.TransactionDate || d.date || ""),
      city: d.city || d.Location || d.location || "Unknown",
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (file.name.toLowerCase().endsWith(".json")) {
        try {
          const data = JSON.parse(text);
          if (Array.isArray(data)) {
            processData(parseJsonInput(data));
          }
        } catch { /* ignore */ }
      } else {
        processData(parseCSV(text));
      }
    };
    reader.readAsText(file);
  };

  const handleRunExample = () => processData(EXAMPLE_DATA);

  const handleGenerate10k = () => {
    const synth = generateSyntheticTransactions(10000, EXAMPLE_DATA);
    processData([...EXAMPLE_DATA, ...synth].slice(0, 10000));
  };

  const handleGoHome = () => {
    setShowHome(true);
    setLoaded(false);
    setResults([]);
    setAccountFlags([]);
    setInputJson([]);
    setRuleBreakdown({});
  };

  if (showHome) {
    return (
      <div className="flex flex-col h-screen items-center justify-center p-6 gap-6">
        <div className="flex items-center gap-3">
          <Shield className="w-10 h-10 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">FinShield</h1>
            <p className="text-sm text-muted-foreground">Suspicious Transaction Detection System</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center max-w-md">
          Analyze transaction data and identify accounts showing suspicious behavior based on predefined fraud detection rules. Upload CSV or JSON files to begin.
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={handleRunExample}
            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-md font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <Play className="w-4 h-4" />
            Run Example Test
          </button>

          <button
            onClick={handleGenerate10k}
            className="flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-md font-medium text-sm border border-border hover:bg-secondary/80 transition-colors"
          >
            <Database className="w-4 h-4" />
            Generate & Analyze 10,000 Txns
          </button>

          <label className="flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-4 py-2.5 rounded-md font-medium text-sm border border-border hover:bg-secondary/80 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            Upload CSV / JSON
            <input type="file" accept=".csv,.json" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>

        <div className="mt-4 bg-card border border-border rounded-md p-4 max-w-lg w-full">
          <h3 className="text-xs font-bold text-foreground mb-2">Detection Rules</h3>
          <ul className="text-[10px] text-muted-foreground space-y-1">
            <li>• <span className="text-foreground">Rule 1:</span> Total daily transaction amount exceeds ₹50,000</li>
            <li>• <span className="text-foreground">Rule 2:</span> More than 3 transactions within 1 minute</li>
            <li>• <span className="text-foreground">Rule 3:</span> Transactions from different cities within 30-minute window</li>
          </ul>
        </div>

        <div className="bg-card border border-border rounded-md p-4 max-w-lg w-full">
          <h3 className="text-xs font-bold text-foreground mb-2">Input Format (JSON)</h3>
          <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap">
{`[
  { "accountId": "A1", "amount": 20000, "timestamp": "2026-02-19T10:00:00", "city": "Delhi" },
  { "accountId": "A1", "amount": 15000, "timestamp": "2026-02-19T10:00:30", "city": "Delhi" },
  { "accountId": "A1", "amount": 20000, "timestamp": "2026-02-19T10:01:00", "city": "Mumbai" }
]`}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen p-3 gap-3 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={handleGoHome} className="text-muted-foreground hover:text-foreground transition-colors" title="Home">
            <Home className="w-4 h-4" />
          </button>
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-sm font-bold tracking-tight text-foreground">FinShield — Suspicious Transaction Detection</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRunExample} className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors bg-secondary px-2.5 py-1.5 rounded border border-border">
            Run Example
          </button>
          <button onClick={handleGenerate10k} className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors bg-secondary px-2.5 py-1.5 rounded border border-border">
            10K Txns
          </button>
          <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors bg-secondary px-2.5 py-1.5 rounded border border-border">
            <Upload className="w-3 h-3" />
            Upload CSV / JSON
            <input type="file" accept=".csv,.json" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Analyzing transactions…</span>
        </div>
      )}

      {loaded && !loading && (
        <>
          <StatsBar results={results} flaggedCount={accountFlags.length} />

          <div className="flex items-center gap-1 shrink-0">
            {(["input", "table", "json", "accounts", "chart"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${
                  activeTab === tab ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "input" ? "Input JSON" : tab === "table" ? "Visual Table" : tab === "json" ? "Output JSON" : tab === "accounts" ? "Flagged Accounts" : "Rule Analytics"}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0">
            {activeTab === "input" && <InputJsonViewer data={inputJson} />}
            {activeTab === "table" && <ResultsTable results={results} />}
            {activeTab === "json" && <JsonViewer flags={accountFlags} />}
            {activeTab === "accounts" && <AccountFlagsPanel flags={accountFlags} />}
            {activeTab === "chart" && <RuleBreakdownChart ruleBreakdown={ruleBreakdown} />}
          </div>
        </>
      )}
    </div>
  );
};

export default Index;
