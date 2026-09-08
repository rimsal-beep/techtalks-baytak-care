# techtalks-baytak-care
Remote property monitoring platform for Lebanese diaspora owners — TechTalks Internship 2026
# Baytak Care

## Project Overview
A remote property monitoring platform that lets Lebanese diaspora
owners see proof of maintenance work on their property — before/after
photos, cost approval, and monthly reports — instead of relying on
phone calls and informal trust.

Target users: Lebanese diaspora property owners (paying customer),
local caretakers/contractors (operational users).

## Tech Stack
- Frontend + Backend: Next.js + TypeScript
- Database: PostgreSQL via Prisma
- Deployment: Docker
- Tracking: Jira

## Getting Started

### Prerequisites

Make sure you have installed:

- Node.js 24+
- Docker Desktop
- Git

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

The default configuration connects to the local PostgreSQL database provided by Docker.

### 3. Start PostgreSQL

```bash
docker compose up -d
```

This starts the PostgreSQL database container on port `5432`.

### 4. Start the development server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### 5. Stop the database

When needed:

```bash
docker compose down
```

## Contribution Workflow
- One feature branch per task
- Open a PR when ready, request review from at least one teammate
- No direct pushes to `main`
