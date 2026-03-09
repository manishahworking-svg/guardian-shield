import { SimpleTransaction } from "@/lib/fraudEngine";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InputJsonViewerProps {
  data: SimpleTransaction[];
}

export const InputJsonViewer = ({ data }: InputJsonViewerProps) => {
  return (
    <ScrollArea className="h-full rounded-md border border-border bg-card">
      <pre className="p-3 text-[11px] font-mono text-foreground whitespace-pre-wrap leading-relaxed">
        {JSON.stringify(data.slice(0, 200), null, 2)}
      </pre>
    </ScrollArea>
  );
};
