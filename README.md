# mr-photo Fe

Next.js frontend for the Laravel backend in `../mr-photo BE`. Same features as the Livewire screens, new UI.

## Run it

```bash
# backend (once): composer install, .env, php artisan migrate
# backend .env:  FRONTEND_URL=http://localhost:3000
php artisan serve            # http://127.0.0.1:8000
php artisan queue:work       # Drive sync, thumbnails, ZIPs, emails

# frontend
cp .env.example .env.local   # BACKEND_URL, NEXT_PUBLIC_APP_NAME
npm install
npm run dev                  # http://localhost:3000
```

The browser only talks to the Next.js origin. `next.config.ts` proxies `/api/*` (and the signed
`/g/{token}/exports/{id}` ZIP links from emails) to Laravel, so the session and XSRF cookies are
first-party and no CORS setup is needed.

## How it is built

- `src/app/globals.css` — the semantic tokens (`bg-surface`, `text-muted`, `border-line`,
  `bg-status-editing-soft`, `rounded-card` …) for light (default) and dark. Components use only these.
- `src/components/ui` — the component kit: Button, Field/Input, Switch, Panel, Pill/StatusBadge,
  Segmented, Dialog, confirm + toast, Meter, DaysPicker, Pagination, ThemeToggle.
- `src/features/*` — screens by domain: `projects` (list, wizard), `project` (detail and its five
  tabs, grid/viewer photo modes), `overview` (studio dashboard), `activity` (feed rows), `gallery`
  (client proofing, review, sent, delivery, password gate).
- `src/lib` — API client (`api.ts`), types matching `routes/spa.php`, formatting, auth hooks.

## Routes

| Frontend | Livewire equivalent |
| --- | --- |
| `/login`, `/register`, `/forgot-password`, `/reset-password/[token]`, `/verify-email`, `/confirm-password` | Breeze auth pages |
| `/dashboard` | Studio overview (needs-you list, KPIs, client activity, deadlines, pipeline) |
| `/activity` | `dashboard` (full activity feed, live) |
| `/projects` | `projects.index` |
| `/projects/new` | `projects.create` (4-step wizard) |
| `/projects/[id]?tab=photos\|selections\|delivery\|timeline\|settings` (photos also `&view=viewer&photo=ID`) | `projects.show` |
| `/profile` | `profile` |
| `/g/[token]`, `/g/[token]/review`, `/g/[token]/submitted` | client gallery |
