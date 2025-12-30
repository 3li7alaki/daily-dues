import Link from "next/link";
import { Dumbbell, Trophy, Flame, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuoteCard } from "@/components/quote-card";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="container flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6" />
          <span className="font-bold text-lg">Daily Dues</span>
        </div>
        <div className="flex items-center gap-2">
          <AnimatedThemeToggler className="p-2 rounded-full hover:bg-muted transition-colors" />
          <Button asChild variant="ghost">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="container py-12 md:py-24">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Build Discipline.
            <br />
            <span className="text-primary">Track Progress.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Daily Dues helps you stay accountable to your commitments.
            Set daily goals, track your progress, and build unbreakable streaks.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/login">Get Started</Link>
            </Button>
          </div>
        </div>

        {/* Quote */}
        <div className="max-w-2xl mx-auto mt-16">
          <QuoteCard />
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Flame className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Build Streaks</h3>
            <p className="text-muted-foreground text-sm">
              Maintain daily streaks and watch your discipline grow.
              Miss a day? The carry-over system keeps you accountable.
            </p>
          </div>
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Compete & Rank</h3>
            <p className="text-muted-foreground text-sm">
              See how you stack up on the leaderboard.
              Earn titles from Novice to Legend as your streak grows.
            </p>
          </div>
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Team Accountability</h3>
            <p className="text-muted-foreground text-sm">
              Admins review your submissions. Real accountability
              with real people keeping you honest.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container py-8 text-center text-sm text-muted-foreground">
        <p>Built with discipline. Powered by commitment.</p>
      </footer>
    </div>
  );
}
