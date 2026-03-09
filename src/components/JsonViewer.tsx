import { AccountFlag } from "@/lib/fraudEngine";
import { ScrollArea } from "@/components/ui/scroll-area";

interface JsonViewerProps {
  flags: AccountFlag[];
}

export const JsonViewer = ({ flags }: JsonViewerProps) => {
  return (
    <ScrollArea className="h-full rounded-md border border-border bg-card">
      <pre className="p-3 text-[11px] font-mono text-foreground whitespace-pre-wrap leading-relaxed">
        {JSON.stringify(flags, null, 2)}
      </pre>
    </ScrollArea>
  );
};
