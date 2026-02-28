# Group Availability

Web app for coordinating group meetings and retreats. Supports monthly Friday meetings, mini retreats (2 days/1 night), and full retreats (4 days/3 nights).

## Features

- **Monthly Friday voting** — pick one Friday per month for 11am–3pm meetings
- **Retreat scheduling** — two-phase approach: mark availability, then vote on best periods
- **Combined calendar** — full year overview with all scheduled events
- **iCal integration** — optional calendar sync to auto-detect conflicts
- **Mobile-first** — works well on phones, tap to vote

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Drizzle ORM + PostgreSQL
- Railway for hosting

## Local Development

```bash
# Install dependencies
npm install

# Set up the database URL
cp .env.example .env.local
# Edit .env.local with your PostgreSQL connection string

# Push schema to database
npm run db:push

# Start dev server
npm run dev
```

## Deploy to Railway

1. Create a new project on [Railway](https://railway.com)
2. Add a **PostgreSQL** service (click "+ New" → "Database" → "PostgreSQL")
3. Add a **GitHub repo** service pointing to this repository
4. In the app service settings, add the `DATABASE_URL` environment variable — use the Railway-provided `DATABASE_PRIVATE_URL` from the PostgreSQL service (or use the variable reference `${{Postgres.DATABASE_PRIVATE_URL}}`)
5. After first deploy, run the schema push:
   - Open the Railway shell for your app service
   - Run `npm run db:push`
6. The app will be available at the Railway-provided URL

## Database Commands

```bash
npm run db:push      # Push schema changes to DB (development)
npm run db:generate  # Generate migration files
npm run db:migrate   # Run migrations (production)
npm run db:studio    # Open Drizzle Studio (DB browser)
```
