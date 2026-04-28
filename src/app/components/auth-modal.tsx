import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useState, useEffect } from "react";
import { Mail, CheckCircle2, ShieldCheck } from "lucide-react";
import { useAuth } from "../providers/auth-provider";
import { useNavigate } from "react-router";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectTo?: string;
}

export function AuthModal({ open, onOpenChange, redirectTo }: AuthModalProps) {
  const { signInWithEmailOtp, verifyEmailOtp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<"send" | "verify">("send");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) {
      setFullName("");
      setEmail("");
      setCode("");
      setSubmitting(false);
      setError(null);
      setSent(false);
      setPhase("send");
    }
  }, [open]);

  const handleSend = async () => {
    setSubmitting(true);
    setError(null);
    const { error } = await signInWithEmailOtp(email, fullName || undefined);
    if (error) {
      setError(error);
    } else {
      setSent(true);
      setPhase("verify");
    }
    setSubmitting(false);
  };

  const handleVerify = async () => {
    setSubmitting(true);
    setError(null);
    const { error } = await verifyEmailOtp(email, code);
    if (error) {
      setError(error);
    } else {
      onOpenChange(false);
      navigate(redirectTo ?? "/dashboard");
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary" style={{ fontWeight: 700 }}>
            Log in with Email OTP
          </DialogTitle>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (submitting) return;
            if (phase === "send") {
              if (!email) return;
              handleSend();
              return;
            }
            if (code.length !== 8) return;
            handleVerify();
          }}
        >
          {phase === "send" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name (optional)</Label>
                <Input
                  id="fullName"
                  placeholder="Alex Johnson"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </>
          )}

          {phase === "verify" && (
            <div className="space-y-2">
              <Label htmlFor="code">Enter OTP from email</Label>
              <Input
                id="code"
                inputMode="numeric"
                pattern="\\d*"
                maxLength={8}
                placeholder="12345678"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              />
              <p className="text-xs text-muted-foreground">We sent an 8-digit code to {email}.</p>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
          {sent && !error && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              Check your email for the OTP to finish signing in.
            </div>
          )}

          {phase === "send" && (
            <Button
              type="submit"
              disabled={!email || submitting}
              className="w-full bg-accent hover:bg-accent/90 text-white"
            >
              <Mail className="h-4 w-4 mr-2" />
              {submitting ? "Sending..." : "Send OTP"}
            </Button>
          )}

          {phase === "verify" && (
            <Button
              type="submit"
              disabled={code.length !== 8 || submitting}
              className="w-full bg-accent hover:bg-accent/90 text-white"
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              {submitting ? "Verifying..." : "Verify & Continue"}
            </Button>
          )}

          <p className="text-xs text-muted-foreground">
            We'll email you a one-time 8-digit code. No password needed.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
