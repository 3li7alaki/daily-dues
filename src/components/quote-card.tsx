"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getDailyQuote } from "@/lib/quotes";

export function QuoteCard() {
  const { quote, author } = getDailyQuote();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-5.5">
          <div className="flex gap-4">
            <Quote className="h-8 w-8 text-primary/40 flex-shrink-0 mt-1" />
            <div className="space-y-2">
              <p className="text-lg italic text-foreground/90 leading-relaxed">
                &ldquo;{quote}&rdquo;
              </p>
              <p className="text-sm text-muted-foreground font-medium">
                — {author}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
