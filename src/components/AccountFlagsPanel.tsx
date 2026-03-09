import { AccountFlag } from "@/lib/fraudEngine";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AccountFlagsPanelProps {
  flags: AccountFlag[];
}

export const AccountFlagsPanel = ({ flags }: AccountFlagsPanelProps) => {
  return (
    <ScrollArea className="h-full rounded-md border border-border bg-card">
      <div className="p-3 space-y-2">
        {flags.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-8">No flagged accounts.</p>
        )}
        {flags.map((f) => (
          <div key={f.accountId} className="border border-border rounded-md p-3 bg-secondary/30">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-sm font-bold text-foreground">{f.accountId}</span>
              <span className="text-[10px] font-medium bg-tag-rule/15 text-tag-rule border border-tag-rule/30 rounded px-1.5 py-0.5">
                {f.reason.length} rule{f.reason.length > 1 ? "s" : ""} violated
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {f.reason.map((r, i) => (
                <span
                  key={i}
                  className="text-[10px] font-medium bg-risk-high/10 text-risk-high border border-risk-high/20 rounded px-2 py-0.5"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
