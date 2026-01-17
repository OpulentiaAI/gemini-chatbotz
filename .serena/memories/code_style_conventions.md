# Code style & conventions
- Language: TypeScript/TSX throughout app; React components are functional.
- Styling: Tailwind CSS utility classes; shadcn/ui + Radix UI patterns; use `cn` helper from `@/lib/utils` for class composition.
- Framework: Next.js App Router (server components by default; add `"use client"` where needed).
- Linting: `next lint` (ESLint config via `eslint-config-next`).