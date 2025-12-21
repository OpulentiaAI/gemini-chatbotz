import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { flightAgent } from "./agent";
import { api } from "./_generated/api";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Register Better Auth HTTP routes with CORS enabled
authComponent.registerRoutes(http, createAuth, {
  cors: {
    allowedOrigins: ["https://chat.opulentia.ai", "https://worldeater.im", "http://localhost:3000", "http://localhost:3002"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: [],
  },
});

http.route({
  path: "/chat",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const { threadId, prompt, userId } = await request.json();

    if (!threadId) {
      return new Response(JSON.stringify({ error: "threadId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const { thread } = await flightAgent.continueThread(ctx, { threadId });
      const result = await thread.streamText(
        { prompt },
        { saveStreamDeltas: { returnImmediately: true } }
      );

      return result.toTextStreamResponse();
    } catch (error) {
      console.error("Chat error:", error);
      return new Response(JSON.stringify({ error: "Failed to process message" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

http.route({
  path: "/chat/stream",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const { threadId, prompt } = await request.json();

    if (!threadId) {
      return new Response(JSON.stringify({ error: "threadId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const { thread } = await flightAgent.continueThread(ctx, { threadId });
      const result = await thread.streamText(
        { prompt },
        { saveStreamDeltas: { returnImmediately: true, throttleMs: 50 } }
      );

      return result.toTextStreamResponse();
    } catch (error) {
      console.error("Stream error:", error);
      return new Response(JSON.stringify({ error: "Failed to stream message" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
