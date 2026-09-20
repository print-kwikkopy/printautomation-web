# PrintAutomation Web

Hosted command centre for the existing Windows PrintAutomation worker.

## Included

- Supabase email/password authentication
- Persistent command queue
- Supabase Realtime updates
- Queue status/progress/history
- Expandable command event logs
- Responsive desktop/mobile UI
- Safe RLS-compatible browser access

## 1. Environment

Copy `.env.local.example` to `.env.local`.

Set:

```env
NEXT_PUBLIC_SUPABASE_URL=https://rbttwaiksvdzyavuypvx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

The publishable key is safe for the browser. Do NOT put the Supabase secret/service-role key in this web app.

## 2. Install

```powershell
npm install
```

## 3. Run locally

```powershell
npm run dev
```

Open http://localhost:3000

Create the first account on the login screen.

## 4. Production build

```powershell
npm run build
npm start
```

## Supabase

This app expects the `commands` and `command_events` schema created in the SQL setup already run in the Supabase project.

## Windows worker

The companion worker integration is in the `worker-integration` folder. It is intentionally separate from the browser app because its secret Supabase credential must remain on the Windows automation machine.
