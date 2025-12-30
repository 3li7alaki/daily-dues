# Daily Dues

A simple, mobile-friendly app for tracking daily commitments with team accountability. Built with discipline in mind.

![Daily Dues](https://img.shields.io/badge/Next.js-15.5.9-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue) ![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-green)

## Features

- **Invite-Only Registration** - Admins invite users, keeping your team exclusive
- **Daily Commitments** - Set daily goals (push-ups, reading, etc.) with custom targets
- **Configurable Work Days** - Default: Bahrain schedule (Sun-Thu), fully customizable per commitment
- **Carry-Over System** - Miss a day? The punishment multiplier ensures accountability (default: 2x carry + daily target)
- **Admin Approval** - All submissions require admin approval before counting
- **Streak Tracking** - Build streaks, earn titles (Novice → Legend)
- **Leaderboard** - Compete with your team, shareable to WhatsApp
- **Daily Stoic Quotes** - Start your day with wisdom from Marcus Aurelius, Seneca, and Epictetus
- **Dark/Light Mode** - Beautiful animated theme toggle
- **Slack Notifications** - Optional webhook integration for team updates
- **Mobile-First Design** - Looks great on any device

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | [Next.js 15.5.9](https://nextjs.org/) (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Database & Auth | [Supabase](https://supabase.com/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| UI Components | [shadcn/ui](https://ui.shadcn.com/) |
| Theme Toggle | [Magic UI](https://magicui.design/) |
| Animations | [Framer Motion](https://www.framer.com/motion/) |
| Forms | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Date Utils | [date-fns](https://date-fns.org/) |
| Notifications | [Sonner](https://sonner.emilkowal.ski/) |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended)
- Supabase account

### 1. Clone and Install

```bash
git clone https://github.com/3li7alaki/daily-dues.git
cd daily-dues
pnpm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `supabase/schema.sql`
3. Copy your project URL and anon key from Settings → API

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Slack webhook for notifications
SLACK_WEBHOOK_URL=your_slack_webhook_url
```

### 4. Create First Admin

1. Start the app and sign up with your email
2. In Supabase SQL Editor, run:
```sql
CALL create_admin('your-email@example.com', 'Your Name');
```

### 5. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login, Register pages
│   ├── (dashboard)/      # Protected dashboard routes
│   │   ├── admin/        # Admin pages (users, commitments, approvals)
│   │   └── dashboard/    # User dashboard & leaderboard
│   └── page.tsx          # Landing page
├── components/
│   ├── admin/            # Admin-specific components
│   ├── ui/               # shadcn/ui components
│   └── *.tsx             # Shared components
├── lib/
│   ├── supabase/         # Supabase client, server, proxy
│   ├── carry-over.ts     # Carry-over calculation engine
│   ├── quotes.ts         # Stoic quotes collection
│   ├── slack.ts          # Modular Slack webhook
│   └── utils.ts          # Utility functions
└── types/
    └── database.ts       # TypeScript types for Supabase
```

## Carry-Over Formula

When a user misses their daily target:

```
Next Day's Due = (Missed Amount × Multiplier) + Daily Target
```

Example with 10 push-ups/day and 2x multiplier:
- Day 1: Miss all 10 → Day 2 due: (10 × 2) + 10 = **30**
- Day 2: Do 20/30 (miss 10) → Day 3 due: (10 × 2) + 10 = **30**

## Rank System

| Streak | Title |
|--------|-------|
| 0-2 days | Novice |
| 3-6 days | Beginner |
| 7-13 days | Rising |
| 14-29 days | Committed |
| 30-49 days | Veteran |
| 50-99 days | Master |
| 100+ days | Legend |

## Slack Integration

The app includes a modular Slack webhook system. Configure which events to send:

```typescript
import { slack } from '@/lib/slack';

// Available events:
slack.notifyUserJoined('John');
slack.notifyCommitmentApproved('John', 'Push-ups', 50, 'reps');
slack.notifyStreakMilestone('John', 30);
slack.notifyCustom('Custom message here');
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Other Platforms

Build for production:
```bash
pnpm build
pnpm start
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - feel free to use this for your own accountability projects.

---

**Built with discipline. Powered by commitment.**
