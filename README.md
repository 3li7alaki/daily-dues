# Daily Dues

A mobile-friendly app for tracking daily commitments with team accountability. Built with discipline in mind.

![Daily Dues](https://img.shields.io/badge/Next.js-15.5.9-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue) ![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-green) ![React Query](https://img.shields.io/badge/React%20Query-5.x-ff4154)

## Features

- **Multi-Realm Support** - Create multiple teams/organizations, users can belong to multiple realms
- **Invite-Only Registration** - Users can only register via invite links (existing users added directly)
- **Username-Based Login** - Users log in with username + password
- **Daily Commitments** - Set daily goals (push-ups, reading, etc.) with custom targets per realm
- **Configurable Work Days** - Default: Bahrain schedule (Sun-Thu), fully customizable per commitment
- **Carry-Over System** - Miss a day? The punishment multiplier ensures accountability (default: 2x carry + daily target)
- **Debt Tracking** - Leaderboard shows carry-over debt for users behind on commitments
- **Admin Approval** - All submissions require admin approval before counting
- **Streak Tracking** - Build streaks, earn titles (Novice → Legend)
- **Leaderboard** - Compete with your team (admins excluded from stats)
- **Daily Stoic Quotes** - Start your day with wisdom from Marcus Aurelius, Seneca, and Epictetus
- **Dark/Light Mode** - Beautiful animated theme toggle
- **Email Invites** - Optional Resend integration for invite emails
- **Mobile-First Design** - Looks great on any device
- **Smooth UX** - React Query for instant updates without page reloads

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | [Next.js 15.5.9](https://nextjs.org/) (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Database & Auth | [Supabase](https://supabase.com/) |
| Data Fetching | [React Query](https://tanstack.com/query) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| UI Components | [shadcn/ui](https://ui.shadcn.com/) |
| Theme Toggle | [Magic UI](https://magicui.design/) |
| Animations | [Framer Motion](https://www.framer.com/motion/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Date Utils | [date-fns](https://date-fns.org/) |
| Notifications | [Sonner](https://sonner.emilkowal.ski/) |
| Email | [Resend](https://resend.com/) (optional) |

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

# Optional: Resend for invite emails (invites work via link copy without this)
RESEND_API_KEY=re_your_api_key
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### 4. Create First Admin

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user" and create a user with email + password
3. In SQL Editor, run:
```sql
CALL make_admin('your_username', 'your-email@example.com', 'Your Display Name');
```
4. Login at `/login` with your username + password

### 5. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## How It Works

### Admin Flow
1. Admin logs in → goes to `/admin/realms` → creates a realm
2. Admin goes to `/admin/users` → selects realm → sends invite to user's email
   - If user already exists, they're added directly to the realm
3. Admin assigns commitments to users from `/admin/commitments`
4. Admin approves/rejects user submissions from `/admin/approvals`

### User Flow
1. User receives invite link → registers with username + password
2. User logs in → sees their commitments for the day (filtered by active days)
3. User logs daily progress → waits for admin approval
4. If rejected, user can re-submit with corrected values
5. User tracks streaks and competes on leaderboard

### Admin vs User Experience
- **Admins** see management pages (Realms, Users, Commitments, Approvals) + Leaderboard
- **Admins** don't have personal dues, stats, or streaks - they're excluded from leaderboard
- **Users** see their Dashboard (commitments, progress, stats) + Leaderboard

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login, Register pages
│   ├── (dashboard)/      # Protected dashboard routes
│   │   ├── admin/        # Admin pages (realms, users, commitments, approvals)
│   │   └── dashboard/    # User dashboard & leaderboard
│   ├── actions/          # Server actions (invite, etc.)
│   └── page.tsx          # Landing page
├── components/
│   ├── admin/            # Admin-specific components
│   ├── ui/               # shadcn/ui components
│   └── *.tsx             # Shared components (UserAvatar, RealmAvatar, etc.)
├── contexts/
│   └── realm-context.tsx # Realm state management
├── lib/
│   ├── supabase/         # Supabase client, server, proxy
│   ├── queries.ts        # React Query hooks (mutations & queries)
│   ├── carry-over.ts     # Carry-over calculation engine
│   ├── email.ts          # Resend email integration
│   ├── quotes.ts         # Stoic quotes collection
│   └── utils.ts          # Utility functions
└── types/
    └── database.ts       # TypeScript types for Supabase
```

## Carry-Over Formula

When a user misses their daily target:

```
Carry-Over Penalty = Missed Amount × Multiplier
Next Day's Total = Carry-Over Penalty + Daily Target
```

Example with 10 push-ups/day and 2x multiplier:
- Day 1: Miss all 10 → Day 2 due: (10 × 2) + 10 = **30**
- Day 2: Do 20/30 (miss 10) → Day 3 due: (10 × 2) + 10 = **30**

The app shows the calculation breakdown: `+20 carry-over penalty (missed 10 × 2x)`

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

## End-of-Day Processing

The app uses `pg_cron` to process commitments at end of day:
- Only processes commitments where today is an active day
- Auto-approves missed logs (marks as approved with 0 completed)
- Calculates carry-over penalties for the next active day
- Resets streaks for users who missed their targets

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

Add to `.env.local`:
```env
SLACK_WEBHOOK_URL=your_slack_webhook_url
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
