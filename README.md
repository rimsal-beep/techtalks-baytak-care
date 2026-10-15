# Baytak Care

**Baytak Care** connects property owners who live abroad with trusted local caretakers. Owners keep a clear view of their homes, approve every maintenance cost before work starts, and see a full history of what happened. Caretakers get one simple place to report issues, send estimates and complete monthly property checks.

Built by the Next.js C team during the TechTalks internship (October 2026).



## Why Baytak Care

Many Lebanese families live abroad and rely on relatives or friends to look after their homes. Problems are reported over chat, costs are agreed by voice note, and nothing is recorded. Baytak Care replaces that with a clear, shared process:

1. A caretaker reports a problem and sends an estimate.
2. The owner approves or rejects it, with a reason.
3. Everything is recorded in an activity log.

## Features

**For owners**
- Add and manage properties, and invite a caretaker by email
- Review maintenance requests with cost estimates
- Approve or reject each request (rejections include a reason)
- Follow the full activity history of every property
- Soft-delete a property without losing its history

**For caretakers**
- Accept an invitation and see only the property assigned to you
- Create maintenance requests with an estimated cost and photos
- Complete monthly property checklists
- Track the status of every request

**Platform**
- Email verification on sign-up
- Signed, expiring session cookies (7 days)
- Role-based access: every server action checks the user, their role and ownership of the property or request
- Landing page, Privacy Policy and Terms pages

## Tech Stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, server actions) |
| Language | TypeScript, React |
| Database | PostgreSQL with Prisma 7 |
| Styling | CSS Modules |
| Email | SMTP (verification and invitation emails) |
| Tests | Node test runner via `tsx`, against a local PostgreSQL database |

## Getting Started

### Prerequisites

- Node.js 20 or newer (the project was developed on Node 24)
- PostgreSQL running locally
- An SMTP account for sending emails (optional for local development, required for email verification and invitations)

### Setup

```bash
git clone https://github.com/rimsal-beep/techtalks-baytak-care.git
cd techtalks-baytak-care
npm install
```

Create a `.env` file in the project root:

> Never commit `.env`. It is listed in `.gitignore`.

Set up the database and start the app:

```bash
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Useful scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build |
| `npx tsc --noEmit` | Type-check the project |
| `npx eslint app` | Lint the app code |

> `npm run start` runs in production mode, which applies stricter checks on `APP_URL` and email links. Use `npm run dev` for local demos.

## Testing

Integration tests run against your **local** PostgreSQL database. They refuse to run unless `DATABASE_URL` points to `localhost`, create their own temporary data and remove it afterwards.

```bash
npx tsx --test tests/property-soft-delete.test.mjs
```

Run one file at a time, and use `npx tsx`, not plain `node`.

### Test database setup (once)

1. Create an empty database named `baytak_care_test` next to your normal one.
2. Copy `.env.test.example` to `.env.test` and set `DATABASE_URL` to that database.
3. Build the tables:
   `$env:DATABASE_URL="<your test URL>"; npx prisma migrate deploy`

## Project Structure

```text
app/
  actions/        Server actions (auth, requests, invitations, email verification)
  Components/     Shared UI (BrandMark, AuthShell, LegalPage, dashboard layout)
  login/ signup/  Authentication pages
  verify-email/   Email verification page
  properties/     Property list, details and creation
  requests/       Request list, details and creation
  caretaker/      Caretaker dashboard
  welcome/        Landing page
  privacy/ terms/ Legal pages
lib/              Session, authorization, prisma client, shared helpers
prisma/           Schema and migrations
public/           Static assets
tests/            Integration tests
```

## Security Notes

- Passwords are hashed, and sessions are signed with `SESSION_SECRET`.
- Authorization is enforced on the server for every action (user, role, ownership), never only in the interface.
- Verification links clear any existing session so a link can never open another user's account.
- Invitation links use a 64-character random token and the redirect path is validated.

## Known Limitations

- A caretaker can be assigned to one property at a time.
- Uploaded files need persistent storage when deployed.
- The project is in a pilot phase and is not yet used with real customers.

## Team

Built by the Next.js C team at TechTalks:

- Reem Salameh (team leader)
- Ali Kassem
- Jad Khafaja
- Maurice Chahine
- Jhony Saba


