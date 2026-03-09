import { FraudResult } from "@/lib/fraudEngine";
import { Shield, AlertTriangle, Users, FileText } from "lucide-react";

interface StatsBarProps {
  results: FraudResult[];
  flaggedCount: number;
}

export const StatsBar = ({ results, flaggedCount }: StatsBarProps) => {
  const total = results.length;
  const flaggedTxns = results.filter((r) => r.ruleReasons.length > 0).length;
  const uniqueAccounts = new Set(results.map((r) => r.accountId)).size;

  const stats = [
    { label: "Total Transactions", value: total.toLocaleString(), icon: FileText, color: "text-primary" },
    { label: "Unique Accounts", value: uniqueAccounts.toLocaleString(), icon: Users, color: "text-accent" },
    { label: "Flagged Accounts", value: flaggedCount.toLocaleString(), icon: AlertTriangle, color: "text-destructive" },
    { label: "Suspicious Txns", value: flaggedTxns.toLocaleString(), icon: Shield, color: "text-risk-medium" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 shrink-0">
      {stats.map((s) => (
        <div key={s.label} className="bg-card border border-border rounded-md px-3 py-2 flex items-center gap-2">
          <s.icon className={`w-4 h-4 ${s.color}`} />
          <div>
            <div className="text-sm font-bold text-foreground leading-none">{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
