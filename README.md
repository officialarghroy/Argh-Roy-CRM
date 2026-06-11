# Argh Roy CRM

Dark-themed personal CRM with daily checklist, tasks, projects (Kanban), SOPs, Google sync, and team collaborators.

## Setup

1. Create a [Supabase](https://supabase.com) project.
2. Copy `.env.example` to `.env` and add your project URL and anon key.
3. In Supabase SQL Editor, run migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_storage_buckets.sql`
   - `supabase/migrations/003_lifetime_calendar_recurrence.sql`
   - `supabase/migrations/004_google_tasks_sync.sql`
   - `supabase/migrations/005_project_logo_storage_policy.sql`
   - `supabase/migrations/006_checklist_ist_reset.sql`
   - `supabase/migrations/007_roles_and_project_members.sql` (optional, for team collaborators)
4. Enable Email auth in Supabase Authentication settings.
5. Install and run:

```bash
npm install
npm run dev
```

Open http://localhost:5173 and sign up with your email.

## Features

- **Daily Checklist** — add items, mark as daily repeat, resets at 3 AM India time
- **Dashboard** — today's overview, overdue count, recent activity
- **My Tasks** — overdue-first sorting, Google Tasks + Calendar sync
- **Calendar** — month grid with day agenda
- **Projects** — grid/list view with logos and Kanban boards
- **Team** — create collaborator accounts and assign them to projects (admin)
- **Google Calendar & Tasks** — two-way sync with instant push
- **SOPs** — document workflows
- **Settings** — profile, avatar crop, timezone, sidebar, Google connect

## Google Calendar & Tasks setup

1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com)
2. Enable **Google Calendar API** and **Google Tasks API**
3. Add redirect URI: `http://localhost:5173/settings/google-callback`
4. Add `VITE_GOOGLE_CLIENT_ID` to `.env`
5. Deploy edge functions:

```bash
npm run supabase:deploy-google
```

6. Connect in Settings → Google Calendar & Tasks

## Production build

```bash
npm run build
npm run preview
```

Deploy the `dist/` folder to Vercel, Netlify, or any static host. Set the same `VITE_*` env vars in your host.
