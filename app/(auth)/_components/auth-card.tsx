"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

const mockDelay = (timeout = 900) => new Promise((resolve) => setTimeout(resolve, timeout));

type AuthMode = "login" | "signup";

type AuthCardProps = {
  mode: AuthMode;
};

export function AuthCard({ mode }: AuthCardProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const title = mode === "login" ? "Login to your account" : "Create your account";
  const description = mode === "login" ? "" : "Enter your details below to create your account";
  const actionLabel = mode === "login" ? "Login" : "Create account";
  const alternateHref = mode === "login" ? "/signup" : "/login";
  const alternateLabel = mode === "login" ? "Sign up" : "Sign in";

  const resetFeedback = () => {
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();

    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }

    if (mode === "signup" && password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      await mockDelay();

      if (mode === "login") {
        setSuccess("Signed in successfully. Redirecting to your dashboard...");
        await mockDelay(600);
        router.push("/");
      } else {
        setSuccess("Account created. You can now sign in with your new credentials.");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      }
    });
  };

  return (
    <Card className="w-full max-w-md border-white/10 bg-white/5 text-white shadow-2xl">
      <CardHeader className="space-y-3">
        <CardTitle className="text-2xl font-semibold text-white">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-sm text-white/70">{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        <Separator className="bg-white/20" />

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isPending}
              className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-white">
                Password
              </Label>
              {mode === "login" && (
                <button
                  type="button"
                  className="text-sm font-medium text-white/70 underline-offset-4 hover:text-white hover:underline"
                  onClick={() => setSuccess("Reset password flow coming soon.")}
                >
                  Forgot your password?
                </button>
              )}
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isPending}
              className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
            />
          </div>
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white">
                Confirm password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={isPending}
                className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
              />
            </div>
          )}
          <Button type="submit" disabled={isPending} variant="light" className="w-full">
            {isPending ? "Please wait..." : actionLabel}
          </Button>
        </form>

        {(error || success) && (
          <Alert variant={success ? "success" : "error"} className="border-white/20 bg-white/10 text-white">
            <div className="flex flex-col gap-1">
              <AlertDescription>{success ?? error}</AlertDescription>
            </div>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Separator className="bg-white/10" />
        <p className="text-sm text-white/70">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <Link href={alternateHref} className="font-medium text-white underline-offset-4 hover:underline">
            {alternateLabel}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
