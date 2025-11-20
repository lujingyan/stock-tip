# Deployment Guide

## Prerequisites
- A GitHub account.
- A Vercel account.
- A PostgreSQL database (e.g., Vercel Postgres, Supabase, Neon).

## Steps

1. **Push to GitHub**
   - Commit your code and push it to a new GitHub repository.

2. **Create Database**
   - Create a new Postgres database.
   - Get the connection string (e.g., `postgres://user:password@host:port/db`).

3. **Import to Vercel**
   - Go to Vercel Dashboard -> Add New -> Project.
   - Import your GitHub repository.

4. **Configure Environment Variables**
   - In the Vercel project settings, add the following environment variable:
     - `DATABASE_URL`: Your Postgres connection string.

5. **Build Command**
   - Vercel usually detects Next.js automatically.
   - To ensure database migrations are applied, you can update the Build Command in Vercel Settings -> General:
     - `npx prisma migrate deploy && next build`

6. **Deploy**
   - Click "Deploy".
   - Vercel will build your app, run migrations, and deploy it.

## Local Development
- To run locally with SQLite:
  - Ensure `.env` has `DATABASE_URL="file:./dev.db"`.
  - Run `npm run dev`.
