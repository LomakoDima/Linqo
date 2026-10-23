import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";

export function ContentEmptyState({ onAddBlock }: { onAddBlock: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-ui border border-border">
        <Sparkles className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <h3 className="font-display text-2xl font-medium">Build your page</h3>
        <p className="mt-1 text-sm text-muted-foreground">Start by adding your first block.</p>
      </div>
      <Button onClick={onAddBlock} className="mt-2">
        <Plus className="mr-2 h-4 w-4" /> Add Block
      </Button>
    </div>
  );
}
