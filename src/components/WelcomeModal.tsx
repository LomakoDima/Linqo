import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Shown once, right after a successful signup (both the email/password path
// in login.tsx and the OAuth path via routes/welcome.tsx) — never on signin.
export function WelcomeModal({
  open,
  firstName,
  onContinue,
  onSkip,
}: {
  open: boolean;
  firstName: string;
  onContinue: () => void;
  onSkip: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onSkip()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Rocket className="h-6 w-6" />
          </div>
          <DialogTitle className="mt-2 text-xl">Welcome to Linqo, {firstName}</DialogTitle>
          <DialogDescription>
            A couple of quick questions help us set your page up with a good starting point.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button onClick={onContinue} size="lg" className="w-full">
            Let&rsquo;s get you set up
          </Button>
          <Button onClick={onSkip} variant="ghost" className="w-full">
            Skip for now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
