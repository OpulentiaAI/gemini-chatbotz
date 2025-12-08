# Agents configuration (production)

Working production setup for the Convex agent + Next.js app:

## Required environment

Set these on Railway (or in `.env.production.local` for parity):

```bash
NEXT_PUBLIC_CONVEX_URL=https://brilliant-ferret-250.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://brilliant-ferret-250.convex.site
SITE_URL=https://chat.opulentia.ai

# Keys used by agent tools
OPENROUTER_API_KEY=...
GOOGLE_GENERATIVE_AI_API_KEY=...
EXA_API_KEY=...

# Auth + storage
BETTER_AUTH_SECRET=...
BLOB_READ_WRITE_TOKEN=...
```

## Start / deploy commands

- `pnpm start` (maps to `next start --hostname 0.0.0.0 --port ${PORT:-3000}`)
- Railway service: `railway up --service chat-opulent`

## Notes

- `railway.toml` pins Node 20 and uses Nixpacks; no custom Dockerfile needed.
- Convex deployment URLs above are the live endpoints; update only if you rotate deployments.

