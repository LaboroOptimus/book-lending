# Book Lending Library

A compact library administration application built for the Engineer Take-Home task.
It uses NestJS, AdminJS, Prisma, PostgreSQL, and Cloudinary.

## What it does

- Manage books, authors, members, loans, and staff accounts through AdminJS at `/admin`.
- Search books by title or ISBN; search members by name or email.
- Create and return loans. A book cannot have two active loans.
- Derive loan status from dates: `ACTIVE`, `OVERDUE`, or `RETURNED`.
- Bulk-mark selected loans as returned.
- Upload book covers directly to Cloudinary; application storage never uses local disk.
- Restrict the librarian role to members and loans. Administrators manage every resource.

## Architecture

The application is one NestJS service. Prisma is the only database access layer and uses
PostgreSQL through `DATABASE_URL`. The domain has four core models: `Book`, `Author`,
`Member`, and `Loan`; `Book` and `Author` are many-to-many, while each loan belongs to
one book and one member. `User` is a separate administrative authentication model.

Business rules live in `LoansService`, not in the AdminJS UI. PostgreSQL also has a
partial unique index that prevents more than one unfinished loan for a book, including
under concurrent requests.

AdminJS was chosen because the assignment specifically asks for framework-generated
administration rather than a hand-built CRUD frontend. NestJS keeps the application
structure familiar, while Prisma provides typed schema migrations and a focused data layer.

## Local setup

Requirements: Node.js 20+, Docker Desktop, and a Cloudinary account.

```bash
cp .env.example .env
docker compose up -d postgres
npm ci
npm run prisma:generate
npm run prisma:deploy
```

Fill in the Cloudinary values and the two seed passwords in `.env`, then run:

```bash
npm run seed
npm run start:dev
```

Open `http://localhost:3000/admin`.

The seed is safe to rerun: it creates or updates its named demo records and does not remove
unrelated database data. It needs `SEED_ADMIN_PASSWORD` and `SEED_LIBRARIAN_PASSWORD`.
Use the credentials below after seeding:

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@book-lending.test` | `SEED_ADMIN_PASSWORD` |
| Librarian | `librarian@book-lending.test` | `SEED_LIBRARIAN_PASSWORD` |

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Local PostgreSQL or Neon connection string. |
| `SESSION_SECRET` | 32+ character secret used to sign sessions. |
| `CSRF_SECRET` | Different 32+ character secret for CSRF protection. |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary credentials for cover uploads. |
| `SEED_ADMIN_PASSWORD` / `SEED_LIBRARIAN_PASSWORD` | Used only when demo users are seeded. |

Never commit `.env`, database URLs, or Cloudinary credentials.

## Verification

```bash
npm run build
npm test
```

The unit tests cover active, overdue, and returned states, plus an attempted loan of a book
that is already checked out.

## Deployment to Render

1. Push this repository to GitHub and create a Neon PostgreSQL database.
2. In Cloudinary, create credentials for the environment.
3. In Render, create a Blueprint from this repository; `render.yaml` defines the web service.
4. Enter all values marked `sync: false` in Render. Use the Neon URL for `DATABASE_URL`.
5. Render builds the Docker image, applies committed Prisma migrations at startup, and serves
   the application over HTTPS. The health endpoint is `/health`.
6. Run `npm run seed` once through the Render shell with the seed passwords set, then sign in
   through `/admin`.

The production container runs `prisma migrate deploy`, not `prisma migrate dev`, so it only
applies migrations that are already committed to the repository.

## Trade-offs

- One `Book` represents one lendable copy. A separate physical-copy model was intentionally
  excluded to keep the workflow small and clear.
- The app has no public catalogue API or customer-facing interface because the scope is the
  operational admin workflow.
- The seed is intentionally additive/idempotent rather than a destructive database reset.
