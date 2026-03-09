import { FraudResult } from "@/lib/fraudEngine";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ResultsTableProps {
  results: FraudResult[];
}

export const ResultsTable = ({ results }: ResultsTableProps) => {
  return (
    <ScrollArea className="h-full rounded-md border border-border bg-card">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-card z-10 border-b border-border">
          <tr>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">#</th>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Account</th>
            <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Amount (₹)</th>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">City</th>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Timestamp</th>
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Violated Rules</th>
            <th className="text-center px-3 py-2 font-semibold text-muted-foreground">Risk</th>
          </tr>
        </thead>
        <tbody>
          {results.slice(0, 500).map((r, idx) => {
            const isNewAccount = idx === 0 || results[idx - 1]?.accountId !== r.accountId;
            const isFlagged = r.ruleReasons.length > 0;

            return (
              <tr
                key={idx}
                className={`border-b border-border/50 hover:bg-secondary/50 transition-colors ${
                  isNewAccount ? "border-t-2 border-t-border" : ""
                } ${isFlagged ? "bg-risk-high/5" : ""}`}
              >
                <td className="px-3 py-1.5 font-mono text-muted-foreground">{idx + 1}</td>
                <td className="px-3 py-1.5 font-mono font-bold text-foreground">{r.accountId}</td>
                <td className="px-3 py-1.5 text-right font-mono text-foreground">
                  ₹{r.amount.toLocaleString("en-IN")}
                </td>
                <td className="px-3 py-1.5 text-foreground">{r.city}</td>
                <td className="px-3 py-1.5 font-mono text-muted-foreground text-[10px]">{r.timestamp}</td>
                <td className="px-3 py-1.5">
                  <div className="flex flex-wrap gap-1">
                    {r.ruleReasons.map((reason, i) => (
                      <span
                        key={i}
                        className="text-[9px] font-medium bg-tag-rule/15 text-tag-rule border border-tag-rule/30 rounded px-1.5 py-0.5"
                      >
                        {reason}
                      </span>
                    ))}
                    {r.ruleReasons.length === 0 && (
                      <span className="text-[9px] text-risk-low">Normal</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-1.5 text-center">
                  <RiskBadge rating={r.flagRating} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ScrollArea>
  );
};

const RiskBadge = ({ rating }: { rating: number }) => {
  let color = "bg-muted text-muted-foreground";
  if (rating >= 80) color = "bg-risk-high/20 text-risk-high";
  else if (rating >= 50) color = "bg-risk-medium/20 text-risk-medium";
  else if (rating >= 20) color = "bg-risk-low/20 text-risk-low";

  return (
    <span className={`inline-flex items-center justify-center text-[10px] font-bold px-2 py-0.5 rounded ${color} min-w-[2rem]`}>
      {rating}
    </span>
  );
};
