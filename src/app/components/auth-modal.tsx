import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useState, useEffect, useRef } from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../providers/auth-provider";
import { useNavigate } from "react-router";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectTo?: string;
}

const OTP_VALID_SECONDS = 300;
const OTP_COOLDOWN_SECONDS = 60;
const OTP_RATE_LIMIT_COOLDOWN_SECONDS = 300;
const otpSendInFlight = new Set<string>();

function formatOtpMinutes(seconds: number) {
  const minutes = Math.max(Math.ceil(seconds / 60), 1);
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

function getOtpCooldownStorageKey(email: string) {
  return `rankio.otp.cooldown.${email.trim().toLowerCase()}`;
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
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const sendLockRef = useRef(false);
  const navigate = useNavigate();

  const cooldownRemainingSeconds =
    cooldownUntil == null ? 0 : Math.max(Math.ceil((cooldownUntil - Date.now()) / 1000), 0);
  const otpRemainingSeconds =
    otpExpiresAt == null ? 0 : Math.max(Math.ceil((otpExpiresAt - Date.now()) / 1000), 0);
  const isCooldownActive = cooldownRemainingSeconds > 0;
  const isOtpExpired = phase === "verify" && otpExpiresAt !== null && otpRemainingSeconds <= 0;

  useEffect(() => {
    if (!cooldownUntil) return;
    if (cooldownUntil <= Date.now()) {
      setCooldownUntil(null);
      return;
    }

    const timer = window.setInterval(() => {
      if (cooldownUntil <= Date.now()) {
        setCooldownUntil(null);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  useEffect(() => {
    if (!otpExpiresAt) return;
    if (otpExpiresAt <= Date.now()) return;

    const timer = window.setInterval(() => {
      if (otpExpiresAt <= Date.now()) {
        setOtpExpiresAt(null);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [otpExpiresAt]);

  useEffect(() => {
    if (!open) {
      setFullName("");
      setEmail("");
      setCode("");
      setSubmitting(false);
      setError(null);
      setSent(false);
      setOtpExpiresAt(null);
      setPhase("send");
    }
  }, [open]);

  useEffect(() => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setCooldownUntil(null);
      return;
    }

    try {
      const raw = sessionStorage.getItem(getOtpCooldownStorageKey(normalizedEmail));
      const parsed = raw ? Number(raw) : NaN;
      setCooldownUntil(Number.isFinite(parsed) && parsed > Date.now() ? parsed : null);
    } catch {
      setCooldownUntil(null);
    }
  }, [email]);

  const startCooldown = (seconds: number) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;

    const expiresAt = Date.now() + seconds * 1000;
    setCooldownUntil(expiresAt);

    try {
      sessionStorage.setItem(getOtpCooldownStorageKey(normalizedEmail), String(expiresAt));
    } catch {
      // ignore storage failures
    }
  };

  const handleSend = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || isCooldownActive || sendLockRef.current || otpSendInFlight.has(normalizedEmail)) return;

    sendLockRef.current = true;
    otpSendInFlight.add(normalizedEmail);
    setSubmitting(true);
    setError(null);
    try {
      const { error } = await signInWithEmailOtp(normalizedEmail, fullName || undefined);
      if (error) {
        setError(error);
        if (String(error).toLowerCase().includes("rate limit")) {
          startCooldown(OTP_RATE_LIMIT_COOLDOWN_SECONDS);
        }
      } else {
        setSent(true);
        setOtpExpiresAt(Date.now() + OTP_VALID_SECONDS * 1000);
        setPhase("verify");
        startCooldown(OTP_COOLDOWN_SECONDS);
      }
    } finally {
      sendLockRef.current = false;
      otpSendInFlight.delete(normalizedEmail);
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (isOtpExpired) {
      setError("This OTP has expired. Please request a new code.");
      return;
    }

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
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (submitting) return;
            if (phase === "send") {
              if (!email || isCooldownActive) return;
              handleSend();
              return;
            }
            if (code.length !== 8 || isOtpExpired) return;
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
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                placeholder="12345678"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              />
              <p className="text-xs text-muted-foreground">
                We sent an 8-digit code to {email}. It is valid for the next {otpRemainingSeconds > 0 ? formatOtpMinutes(otpRemainingSeconds) : "5 minutes"}.
              </p>
              {isOtpExpired ? <p className="text-xs font-medium text-red-600">This OTP has expired. Please request a new code.</p> : null}
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">
                  {isCooldownActive ? `You can request a new OTP in ${formatOtpMinutes(cooldownRemainingSeconds)}.` : "Didn't get it?"}
                </span>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={submitting || isCooldownActive}
                  className="text-accent disabled:text-muted-foreground"
                >
                  {isCooldownActive ? "Resend locked" : "Resend OTP"}
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
          {phase === "send" && (
            <Button
              type="submit"
              disabled={!email || submitting || isCooldownActive}
              className="w-full"
            >
              <Mail className="h-4 w-4 mr-2" />
              {submitting ? "Sending..." : isCooldownActive ? `Try again in ${formatOtpMinutes(cooldownRemainingSeconds)}` : "Send OTP"}
            </Button>
          )}

          {phase === "verify" && (
            <Button
              type="submit"
              disabled={code.length !== 8 || submitting || isOtpExpired}
              className="w-full"
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              {submitting ? "Verifying..." : "Verify & Continue"}
            </Button>
          )}

          {phase === "send" && (
            <p className="text-xs text-muted-foreground">
              We'll email you a one-time 8-digit code. The OTP is valid for 5 minutes.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
