# Reservation Tracking

Internal venue and space reservation calendar built with Next.js App Router,
Tailwind CSS, and local PostgreSQL.

## Local Database

The app uses:

```bash
DATABASE_URL=postgres://naderkhaddaj@localhost:5432/reservation_tracking
```

The database has already been created and seeded locally. In pgAdmin, connect to
the local PostgreSQL server and open the `reservation_tracking` database.

Useful commands:

```bash
npm run db:migrate
npm run db:seed
npm run db:reset
```

## Development

```bash
npm run dev
```

The current dev server is running on:

```bash
http://localhost:3001
```

## Seed Accounts

```text
Superadmin: admin@example.com / admin123
Owner: maya@example.com / owner123
Owner: karim@example.com / owner123
```

## Verification

```bash
npm run lint
npm run build
```
