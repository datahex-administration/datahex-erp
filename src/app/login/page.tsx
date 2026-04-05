"use client";

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
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-2">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Datahex ERP</CardTitle>
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
