"use client";

import Image from "next/image";
import { useState, useRef } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Datahex ERP";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);

    if (value && index < 5) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  };

  const handlePinPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setPin(pasted.split(""));
      pinRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const pinStr = pin.join("");
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    if (pinStr.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setLoading(true);
    const result = await login(email, pinStr);
    if (!result.success) {
      setError(result.error || "Login failed");
      setPin(["", "", "", "", "", ""]);
      pinRefs.current[0]?.focus();
    }
    setLoading(false);
  };

  const handleResetPin = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!resetEmail.trim()) {
      toast.error("Enter your email to receive a new PIN");
      return;
    }

    setResetSubmitting(true);

    const res = await fetch("/api/auth/reset-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: resetEmail }),
    });

    const data = await res.json();

    if (res.ok) {
      toast.success(data.message || "If the account exists, a new PIN has been sent.");
      setResetDialogOpen(false);
    } else {
      toast.error(data.error || "Failed to reset PIN");
    }

    setResetSubmitting(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,107,246,0.2),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(126,87,255,0.18),transparent_26%),linear-gradient(180deg,rgba(248,250,255,0.98),rgba(239,243,255,0.94))]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(89,110,255,0.18),transparent_62%)] blur-3xl" />
      <Card className="relative w-full max-w-md border-white/60 bg-card/82 shadow-[0_28px_72px_rgba(58,68,128,0.2)] backdrop-blur-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-20 items-center justify-center rounded-[2rem] border border-white/50 bg-[linear-gradient(135deg,rgba(79,107,246,0.18),rgba(126,87,255,0.16))] px-6 shadow-[0_18px_44px_rgba(76,92,201,0.18)]">
            <Image
              src="/logo.webp"
              alt={appName}
              width={204}
              height={103}
              priority
              className="h-11 w-auto"
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/75">
              Secure ERP Access
            </p>
            <CardTitle className="text-2xl font-semibold tracking-[-0.03em]">{appName}</CardTitle>
          </div>
          <p className="text-muted-foreground text-sm">
            Enter your credentials to access the dashboard
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@datahex.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>6-Digit PIN</Label>
              <div className="flex gap-2 justify-center">
                {pin.map((digit, i) => (
                  <Input
                    key={i}
                    ref={(el) => { pinRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(i, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(i, e)}
                    onPaste={i === 0 ? handlePinPaste : undefined}
                    className="w-12 h-14 text-center text-xl font-mono"
                    autoComplete="off"
                  />
                ))}
              </div>
            </div>

            {error && (
              <div className="text-sm text-destructive text-center bg-destructive/10 py-2 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
              <DialogTrigger
                render={
                  <Button
                    type="button"
                    variant="link"
                    className="mx-auto flex h-auto p-0 text-sm"
                    onClick={() => setResetEmail(email)}
                  >
                    Forgot PIN?
                  </Button>
                }
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reset your PIN</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleResetPin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(event) => setResetEmail(event.target.value)}
                      placeholder="you@datahex.com"
                      required
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    A new PIN will be delivered to your configured email and WhatsApp number.
                  </p>
                  <Button type="submit" className="w-full" disabled={resetSubmitting}>
                    {resetSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send new PIN"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
