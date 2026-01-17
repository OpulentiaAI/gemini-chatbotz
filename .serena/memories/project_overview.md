# Project overview
- Purpose: Next.js App Router AI chatbot template (Gemini-focused) with Convex agent backend, Better Auth, and persistence.
- Stack: Next.js 16 App Router, React 19 RC, TypeScript, Tailwind CSS + shadcn/ui + Radix UI, Convex (agent), Better Auth, Vercel Postgres/Blob.
- Deployment: Vercel or Railway (Nixpacks). Production env in `agents.md` + README.
- Key directories: `app/` (routes, UI), `components/` (shared UI), `convex/` (Convex functions/agent), `ai/`, `lib/`, `db/`, `hooks/`, `tests/`.
- Env: see `.env.example`, README, and `agents.md` for required keys and Convex URLs.