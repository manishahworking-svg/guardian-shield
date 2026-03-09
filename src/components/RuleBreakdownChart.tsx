import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { RULE_REASONS } from "@/lib/fraudEngine";

interface RuleBreakdownChartProps {
  ruleBreakdown: Record<string, number>;
}

const COLORS = ["hsl(0, 72%, 55%)", "hsl(200, 70%, 50%)", "hsl(45, 90%, 55%)"];

const SHORT_LABELS: Record<string, string> = {
  [RULE_REASONS.HIGH_DAILY]: "High Daily Amount",
  [RULE_REASONS.RAPID_TXN]: "Rapid Transactions",
  [RULE_REASONS.DIFF_CITIES]: "Different Cities",
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
    <div className="h-full rounded-md border border-border bg-card p-4 flex flex-col gap-4 overflow-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Rule Violation Breakdown</h3>
        <span className="text-[10px] text-muted-foreground">{total} total violations across accounts</span>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 min-h-[300px]">
        {/* Bar Chart */}
        <div>
          <h4 className="text-xs text-muted-foreground mb-2">Accounts per Rule</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
              <XAxis dataKey="rule" tick={{ fill: "hsl(210, 20%, 80%)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(220, 18%, 10%)",
                  border: "1px solid hsl(220, 15%, 18%)",
                  borderRadius: "6px",
                  fontSize: "11px",
                  color: "hsl(210, 20%, 90%)",
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div>
          <h4 className="text-xs text-muted-foreground mb-2">Distribution</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="rule"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ rule, count }) => `${rule}: ${count}`}
                labelLine={false}
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} fillOpacity={0.85} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(220, 18%, 10%)",
                  border: "1px solid hsl(220, 15%, 18%)",
                  borderRadius: "6px",
                  fontSize: "11px",
                  color: "hsl(210, 20%, 90%)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-2">
        {data.map((d, i) => (
          <div key={d.rule} className="flex items-center gap-2 bg-secondary/30 rounded px-2 py-1.5">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <div className="min-w-0">
              <div className="text-[10px] text-foreground font-medium truncate">{d.fullRule}</div>
              <div className="text-[10px] text-muted-foreground">{d.count} account{d.count !== 1 ? "s" : ""}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
