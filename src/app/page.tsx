import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuoteCard } from "@/components/quote-card";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col">
      {/* Header */}
      <header className="w-full border-b bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-6 w-6" />
            <span className="font-bold text-xl">Daily Dues</span>
          </div>
          <div className="flex items-center gap-3">
            <AnimatedThemeToggler className="p-2 rounded-full hover:bg-muted transition-colors" />
            <Button asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full text-center space-y-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
            Build Discipline.
            <br />
            <span className="text-primary">Track Progress.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Stay accountable to your daily commitments. Build streaks. Grow stronger.
          </p>
          <Button asChild size="lg" className="px-8">
            <Link href="/login">Get Started</Link>
          </Button>
        </div>

        {/* Quote */}
        <div className="max-w-lg w-full mt-16 px-4">
          <QuoteCard />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        <p>Built with discipline. Powered by commitment.</p>
      </footer>
    </div>
  );
}
