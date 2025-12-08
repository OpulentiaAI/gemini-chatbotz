# Convex Functions

## Environment Variables

Set these environment variables in your Convex dashboard (or `.env.local` for local dev):

```bash
# OpenRouter API key for multi-model support and file analysis
OPENROUTER_API_KEY=your_openrouter_api_key

# Exa API key for web search
EXA_API_KEY=your_exa_api_key

# Better Auth
BETTER_AUTH_SECRET=your_better_auth_secret   # e.g. openssl rand -base64 32
SITE_URL=http://localhost:3000               # or your prod URL
CONVEX_SITE_URL=https://your-deployment.convex.site
```

## PDF & File Analysis

The app uses OpenRouter with base64-encoded files for analysis via Gemini models. This supports:

- **PDF Analysis**: Direct PDF processing without text extraction
- **Image Analysis**: Vision capabilities for images
- **Structured Extraction**: Extract summaries, key points, entities, tables

### Agent Tools

- `analyzePDF` - Analyze a PDF with natural language prompts
- `analyzePDFStructured` - Extract structured data (summary, keyPoints, entities, tables)
- `analyzeMultipleFiles` - Compare/analyze multiple files together
- `analyzeImage` - Analyze images with vision capabilities

### Usage

Upload files through the chat interface, then ask questions about them. The agent will automatically use the appropriate analysis tools.

---

Auth & routing
---------------
- Better Auth routes are registered via `authComponent.registerRoutes(http, createAuth)` in `convex/http.ts`.
- Email/password flows hit `/api/auth/sign-in/email` and `/api/auth/sign-up/email` (proxied to Convex).

---

Write your Convex functions here.
See https://docs.convex.dev/functions for more.

A query function that takes two arguments looks like:

```ts
// convex/myFunctions.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const myQueryFunction = query({
  // Validators for arguments.
  args: {
    first: v.number(),
    second: v.string(),
  },

  // Function implementation.
  handler: async (ctx, args) => {
    // Read the database as many times as you need here.
    // See https://docs.convex.dev/database/reading-data.
    const documents = await ctx.db.query("tablename").collect();

    // Arguments passed from the client are properties of the args object.
    console.log(args.first, args.second);

    // Write arbitrary JavaScript here: filter, aggregate, build derived data,
    // remove non-public properties, or create new objects.
    return documents;
  },
});
```

Using this query function in a React component looks like:

```ts
const data = useQuery(api.myFunctions.myQueryFunction, {
  first: 10,
  second: "hello",
});
```

A mutation function looks like:

```ts
// convex/myFunctions.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const myMutationFunction = mutation({
  // Validators for arguments.
  args: {
    first: v.string(),
    second: v.string(),
  },

  // Function implementation.
  handler: async (ctx, args) => {
    // Insert or modify documents in the database here.
    // Mutations can also read from the database like queries.
    // See https://docs.convex.dev/database/writing-data.
    const message = { body: args.first, author: args.second };
    const id = await ctx.db.insert("messages", message);

    // Optionally, return a value from your mutation.
    return await ctx.db.get(id);
  },
});
```

Using this mutation function in a React component looks like:

```ts
const mutation = useMutation(api.myFunctions.myMutationFunction);
function handleButtonPress() {
  // fire and forget, the most common way to use mutations
  mutation({ first: "Hello!", second: "me" });
  // OR
  // use the result once the mutation has completed
  mutation({ first: "Hello!", second: "me" }).then((result) =>
    console.log(result),
  );
}
```

Use the Convex CLI to push your functions to a deployment. See everything
the Convex CLI can do by running `npx convex -h` in your project root
directory. To learn more, launch the docs with `npx convex docs`.
