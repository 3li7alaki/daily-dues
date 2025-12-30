export const stoicQuotes = [
  {
    quote: "We suffer more often in imagination than in reality.",
    author: "Seneca",
  },
  {
    quote: "The obstacle is the way.",
    author: "Marcus Aurelius",
  },
  {
    quote: "No man is free who is not master of himself.",
    author: "Epictetus",
  },
  {
    quote: "Begin at once to live, and count each separate day as a separate life.",
    author: "Seneca",
  },
  {
    quote: "You have power over your mind - not outside events. Realize this, and you will find strength.",
    author: "Marcus Aurelius",
  },
  {
    quote: "Waste no more time arguing about what a good man should be. Be one.",
    author: "Marcus Aurelius",
  },
  {
    quote: "He who fears death will never do anything worthy of a living man.",
    author: "Seneca",
  },
  {
    quote: "It is not the man who has too little, but the man who craves more, that is poor.",
    author: "Seneca",
  },
  {
    quote: "First say to yourself what you would be; and then do what you have to do.",
    author: "Epictetus",
  },
  {
    quote: "The happiness of your life depends upon the quality of your thoughts.",
    author: "Marcus Aurelius",
  },
  {
    quote: "Difficulties strengthen the mind, as labor does the body.",
    author: "Seneca",
  },
  {
    quote: "Man conquers the world by conquering himself.",
    author: "Zeno of Citium",
  },
  {
    quote: "If it is not right, do not do it; if it is not true, do not say it.",
    author: "Marcus Aurelius",
  },
  {
    quote: "We are more often frightened than hurt; and we suffer more from imagination than from reality.",
    author: "Seneca",
  },
  {
    quote: "How long are you going to wait before you demand the best for yourself?",
    author: "Epictetus",
  },
  {
    quote: "The best revenge is not to be like your enemy.",
    author: "Marcus Aurelius",
  },
  {
    quote: "Luck is what happens when preparation meets opportunity.",
    author: "Seneca",
  },
  {
    quote: "What we do now echoes in eternity.",
    author: "Marcus Aurelius",
  },
  {
    quote: "He suffers more than necessary, who suffers before it is necessary.",
    author: "Seneca",
  },
  {
    quote: "Caretake this moment. Immerse yourself in its particulars.",
    author: "Epictetus",
  },
  {
    quote: "The soul becomes dyed with the color of its thoughts.",
    author: "Marcus Aurelius",
  },
  {
    quote: "True happiness is to enjoy the present, without anxious dependence upon the future.",
    author: "Seneca",
  },
  {
    quote: "No great thing is created suddenly.",
    author: "Epictetus",
  },
  {
    quote: "Think of yourself as dead. You have lived your life. Now take what's left and live it properly.",
    author: "Marcus Aurelius",
  },
  {
    quote: "As is a tale, so is life: not how long it is, but how good it is, is what matters.",
    author: "Seneca",
  },
  {
    quote: "It is not things that disturb us, but our judgments about things.",
    author: "Epictetus",
  },
  {
    quote: "The impediment to action advances action. What stands in the way becomes the way.",
    author: "Marcus Aurelius",
  },
  {
    quote: "Hang on to your youthful enthusiasms – you'll be able to use them better when you're older.",
    author: "Seneca",
  },
  {
    quote: "Freedom is the only worthy goal in life. It is won by disregarding things that lie beyond our control.",
    author: "Epictetus",
  },
  {
    quote: "Very little is needed to make a happy life; it is all within yourself, in your way of thinking.",
    author: "Marcus Aurelius",
  },
];

export function getDailyQuote(): { quote: string; author: string } {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  return stoicQuotes[dayOfYear % stoicQuotes.length];
}
