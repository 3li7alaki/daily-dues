"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, UserPlus, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { registerUser } from "@/app/actions/register";
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
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [inviteToken, setInviteToken] = useState("");
  const [realmName, setRealmName] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [inviteValid, setInviteValid] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const validateInvite = useCallback(async (token: string) => {
    setValidating(true);
    const { data } = await supabase
      .from("invites")
      .select("email, realm:realms(name)")
      .eq("token", token)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (data?.email) {
      setInviteValid(true);
      setEmail(data.email);
      // @ts-expect-error - realm is joined
      setRealmName(data.realm?.name || "");
    } else {
      toast.error("Invalid or expired invite link");
      router.push("/login");
      return;
    }
    setValidating(false);
  }, [supabase, router]);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      router.push("/login");
      return;
    }
    setInviteToken(token);
    validateInvite(token);
  }, [searchParams, validateInvite, router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await registerUser({
      token: inviteToken,
      username,
      name,
      password,
    });

    if (!result.success) {
      toast.error(result.error || "Failed to create account");
      setLoading(false);
      return;
    }

    // Sign in the user after registration
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      toast.error("Account created but failed to sign in. Please login manually.");
      router.push("/login");
      return;
    }

    toast.success("Account created! Welcome to Daily Dues!");
    router.push("/dashboard");
    router.refresh();
  };

  if (validating) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!inviteValid) {
    return null;
  }

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
            {realmName ? `You're joining ${realmName}` : "Create your account"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                required
                minLength={3}
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and underscores only
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
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
                value={email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email is set by your invite
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pt-2">
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
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
