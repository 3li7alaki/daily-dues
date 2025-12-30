"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [validatingInvite, setValidatingInvite] = useState(false);
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setInviteToken(token);
      validateInvite(token);
    }
  }, [searchParams]);

  const validateInvite = async (token: string) => {
    setValidatingInvite(true);
    const { data } = await supabase
      .from("invites")
      .select("email")
      .eq("token", token)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    setInviteValid(!!data);
    if (data?.email) {
      setEmail(data.email);
    }
    setValidatingInvite(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteToken) {
      toast.error("An invite token is required");
      return;
    }

    setLoading(true);

    // Validate invite
    const { data: invite, error: inviteError } = await supabase
      .from("invites")
      .select("id, email")
      .eq("token", inviteToken)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (inviteError || !invite) {
      toast.error("Invalid or expired invite token");
      setLoading(false);
      return;
    }

    if (invite.email !== email) {
      toast.error("Email doesn't match the invite");
      setLoading(false);
      return;
    }

    // Sign up
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (authError || !authData.user) {
      toast.error(authError?.message || "Failed to create account");
      setLoading(false);
      return;
    }

    // Create profile
    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      email,
      name,
      role: "user",
    });

    if (profileError) {
      toast.error("Failed to create profile");
      setLoading(false);
      return;
    }

    // Mark invite as used
    await supabase
      .from("invites")
      .update({ used: true })
      .eq("id", invite.id);

    toast.success("Account created! Welcome to Daily Dues!");
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md"
    >
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-end mb-2">
            <AnimatedThemeToggler className="p-2 rounded-full hover:bg-muted transition-colors" />
          </div>
          <CardTitle className="text-2xl font-bold">Join Daily Dues</CardTitle>
          <CardDescription>
            Create your account with an invite
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Invite Token</Label>
              <Input
                id="token"
                type="text"
                placeholder="Enter your invite token"
                value={inviteToken}
                onChange={(e) => {
                  setInviteToken(e.target.value);
                  if (e.target.value.length > 10) {
                    validateInvite(e.target.value);
                  }
                }}
                required
              />
              {validatingInvite && (
                <p className="text-xs text-muted-foreground">
                  Validating invite...
                </p>
              )}
              {inviteValid === false && !validatingInvite && inviteToken && (
                <p className="text-xs text-destructive">
                  Invalid or expired invite
                </p>
              )}
              {inviteValid === true && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  Valid invite!
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={inviteValid === true}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              disabled={loading || inviteValid === false}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Account
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}
