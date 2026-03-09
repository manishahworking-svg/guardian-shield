import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { RULE_NAMES } from "@/lib/fraudEngine";

interface RuleBreakdownChartProps {
  ruleBreakdown: Record<string, number>;
}

const COLORS = [
  "hsl(0, 72%, 55%)",
  "hsl(30, 85%, 55%)",
  "hsl(200, 70%, 50%)",
  "hsl(270, 60%, 60%)",
  "hsl(45, 90%, 55%)",
  "hsl(160, 70%, 45%)",
];

const SHORT_LABELS: Record<string, string> = {
  [RULE_NAMES.R1]: "High Daily Amount",
  [RULE_NAMES.R2]: "Rapid Transactions",
  [RULE_NAMES.R3]: "Multi-City",
  [RULE_NAMES.R4]: "Large Single Txn",
  [RULE_NAMES.R5]: "Excessive Txns",
  [RULE_NAMES.R6]: "Repeated Identical",
};

export const RuleBreakdownChart = ({ ruleBreakdown }: RuleBreakdownChartProps) => {
  const data = Object.entries(ruleBreakdown)
    .map(([rule, count]) => ({
      rule: SHORT_LABELS[rule] || rule,
      fullRule: rule,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="h-full rounded-md border border-border bg-card p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Rule Violation Breakdown</h3>
        <span className="text-[10px] text-muted-foreground">{total} total violations across accounts</span>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 120 }}>
            <XAxis type="number" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              dataKey="rule"
              type="category"
              tick={{ fill: "hsl(210, 20%, 80%)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={115}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(220, 18%, 10%)",
                border: "1px solid hsl(220, 15%, 18%)",
                borderRadius: "6px",
                fontSize: "11px",
                color: "hsl(210, 20%, 90%)",
              }}
              formatter={(value: number, _name: string, props: any) => [
                `${value} account${value !== 1 ? "s" : ""}`,
                props.payload.fullRule,
              ]}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend cards */}
      <div className="grid grid-cols-3 gap-2">
        {data.map((d, i) => (
          <div key={d.rule} className="flex items-center gap-2 bg-secondary/30 rounded px-2 py-1.5">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <div className="min-w-0">
              <div className="text-[10px] text-foreground font-medium truncate">{d.rule}</div>
              <div className="text-[10px] text-muted-foreground">{d.count} account{d.count !== 1 ? "s" : ""}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
