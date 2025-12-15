/**
 * Cortex Memory System - Integration Tests
 * 
 * Tests the memory system by calling the deployed Convex backend.
 * Run with: pnpm test:memory
 */

import { ConvexHttpClient } from "convex/browser";
import { expect, test, describe, beforeAll } from "vitest";
import { api } from "./_generated/api";

// Use the deployed Convex URL
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://brilliant-ferret-250.convex.cloud";

describe("Cortex Memory System Integration Tests", () => {
  let client: ConvexHttpClient;
  const testSpaceId = `test-space-${Date.now()}`;
  const testUserId = "test-user";

  beforeAll(() => {
    client = new ConvexHttpClient(CONVEX_URL);
  });

  describe("Memory Spaces", () => {
    test("should create or get memory space", async () => {
      const space = await client.mutation(api.cortexMemorySpaces.getOrCreate, {
        memorySpaceId: testSpaceId,
        name: "Test Memory Space",
        type: "personal",
      });

      expect(space).toBeDefined();
      expect(space?.memorySpaceId).toBe(testSpaceId);
      expect(space?.status).toBe("active");
    });

    test("should get existing memory space", async () => {
      const space = await client.query(api.cortexMemorySpaces.get, {
        memorySpaceId: testSpaceId,
      });

      expect(space).toBeDefined();
      expect(space?.memorySpaceId).toBe(testSpaceId);
    });

    test("should check if memory space exists", async () => {
      const exists = await client.query(api.cortexMemorySpaces.exists, {
        memorySpaceId: testSpaceId,
      });

      expect(exists).toBe(true);
    });
  });

  describe("Facts Store", () => {
    let storedFactId: string;

    test("should store a new fact", async () => {
      const fact = await client.mutation(api.cortexFacts.store, {
        memorySpaceId: testSpaceId,
        userId: testUserId,
        fact: "User prefers dark mode interface",
        factType: "preference",
        confidence: 90,
        sourceType: "tool",
        tags: ["ui", "preference", "test"],
      });

      expect(fact).toBeDefined();
      expect(fact?.factId).toBeDefined();
      expect(fact?.fact).toBe("User prefers dark mode interface");
      expect(fact?.factType).toBe("preference");
      expect(fact?.confidence).toBe(90);
      expect(fact?.version).toBe(1);

      storedFactId = fact!.factId;
    });

    test("should get fact by ID", async () => {
      const fact = await client.query(api.cortexFacts.get, {
        memorySpaceId: testSpaceId,
        factId: storedFactId,
      });

      expect(fact).toBeDefined();
      expect(fact?.factId).toBe(storedFactId);
    });

    test("should list facts by memory space", async () => {
      // Store another fact
      await client.mutation(api.cortexFacts.store, {
        memorySpaceId: testSpaceId,
        userId: testUserId,
        fact: "User works with TypeScript",
        factType: "knowledge",
        confidence: 85,
        sourceType: "tool",
        tags: ["tech", "skills", "test"],
      });

      const facts = await client.query(api.cortexFacts.list, {
        memorySpaceId: testSpaceId,
      });

      expect(facts.length).toBeGreaterThanOrEqual(2);
    });

    test("should search facts by content", async () => {
      const results = await client.query(api.cortexFacts.search, {
        memorySpaceId: testSpaceId,
        query: "dark mode",
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(f => f.fact.includes("dark mode"))).toBe(true);
    });

    test("should update fact and create new version", async () => {
      const updated = await client.mutation(api.cortexFacts.update, {
        memorySpaceId: testSpaceId,
        factId: storedFactId,
        fact: "User strongly prefers dark mode interface",
        confidence: 95,
      });

      expect(updated).toBeDefined();
      expect(updated?.fact).toBe("User strongly prefers dark mode interface");
      expect(updated?.version).toBe(2);
      expect(updated?.supersedes).toBe(storedFactId);
    });
  });

  describe("Vector Memories", () => {
    let storedMemoryId: string;

    test("should store a new memory", async () => {
      const memory = await client.mutation(api.cortexMemories.store, {
        memorySpaceId: testSpaceId,
        userId: testUserId,
        content: "User is building a chatbot application with Convex",
        contentType: "raw",
        sourceType: "tool",
        importance: 75,
        tags: ["project", "convex", "test"],
      });

      expect(memory).toBeDefined();
      expect(memory?.memoryId).toBeDefined();
      expect(memory?.content).toBe("User is building a chatbot application with Convex");
      expect(memory?.importance).toBe(75);
      expect(memory?.version).toBe(1);

      storedMemoryId = memory!.memoryId;
    });

    test("should get memory by ID", async () => {
      const memory = await client.query(api.cortexMemories.get, {
        memorySpaceId: testSpaceId,
        memoryId: storedMemoryId,
      });

      expect(memory).toBeDefined();
      expect(memory?.memoryId).toBe(storedMemoryId);
    });

    test("should list memories by memory space", async () => {
      // Store another memory
      await client.mutation(api.cortexMemories.store, {
        memorySpaceId: testSpaceId,
        userId: testUserId,
        content: "User prefers functional programming patterns",
        contentType: "raw",
        sourceType: "tool",
        importance: 70,
        tags: ["coding", "patterns", "test"],
      });

      const memories = await client.query(api.cortexMemories.list, {
        memorySpaceId: testSpaceId,
      });

      expect(memories.length).toBeGreaterThanOrEqual(2);
    });

    test("should search memories by content", async () => {
      const results = await client.query(api.cortexMemories.search, {
        memorySpaceId: testSpaceId,
        query: "chatbot Convex",
      });

      expect(results.length).toBeGreaterThan(0);
    });

    test("should update memory and create new version", async () => {
      const updated = await client.mutation(api.cortexMemories.update, {
        memorySpaceId: testSpaceId,
        memoryId: storedMemoryId,
        content: "User is building an AI chatbot application with Convex and Next.js",
        importance: 85,
      });

      expect(updated).toBeDefined();
      expect(updated?.content).toBe("User is building an AI chatbot application with Convex and Next.js");
      expect(updated?.importance).toBe(85);
      expect(updated?.version).toBe(2);
      expect(updated?.previousVersions.length).toBe(1);
    });
  });

  describe("Integration Workflow", () => {
    const workflowSpaceId = `workflow-test-${Date.now()}`;

    test("should handle complete memory workflow", async () => {
      // 1. Create memory space
      const space = await client.mutation(api.cortexMemorySpaces.getOrCreate, {
        memorySpaceId: workflowSpaceId,
        name: "Workflow Test Space",
        type: "personal",
      });
      expect(space).toBeDefined();

      // 2. Store identity fact
      const identityFact = await client.mutation(api.cortexFacts.store, {
        memorySpaceId: workflowSpaceId,
        userId: "workflow-user",
        fact: "User's name is Alice",
        factType: "identity",
        confidence: 100,
        sourceType: "conversation",
        tags: ["name", "identity"],
      });
      expect(identityFact?.factId).toBeDefined();

      // 3. Store preference fact
      const prefFact = await client.mutation(api.cortexFacts.store, {
        memorySpaceId: workflowSpaceId,
        userId: "workflow-user",
        fact: "Alice prefers concise responses",
        factType: "preference",
        confidence: 85,
        sourceType: "conversation",
        tags: ["communication", "preference"],
      });
      expect(prefFact?.factId).toBeDefined();

      // 4. Store related memory
      await client.mutation(api.cortexMemories.store, {
        memorySpaceId: workflowSpaceId,
        userId: "workflow-user",
        content: "User Alice prefers concise responses and dark mode",
        contentType: "fact",
        sourceType: "tool",
        importance: 90,
        tags: ["preference", "summary"],
        factCategory: "preference",
      });

      // 5. Search for user preferences
      const searchResults = await client.query(api.cortexFacts.search, {
        memorySpaceId: workflowSpaceId,
        query: "Alice preferences",
      });
      expect(searchResults.length).toBeGreaterThan(0);

      // 6. List all facts
      const allFacts = await client.query(api.cortexFacts.list, {
        memorySpaceId: workflowSpaceId,
      });
      expect(allFacts.length).toBeGreaterThanOrEqual(2);

      // 7. Update identity
      const updatedFact = await client.mutation(api.cortexFacts.update, {
        memorySpaceId: workflowSpaceId,
        factId: identityFact!.factId,
        fact: "User's full name is Alice Johnson",
        confidence: 100,
      });
      expect(updatedFact?.version).toBe(2);

      console.log("✅ Complete workflow test passed!");
    });
  });

  describe("Cleanup", () => {
    test("should delete test memories", async () => {
      const result = await client.mutation(api.cortexMemories.deleteMany, {
        memorySpaceId: testSpaceId,
      });
      
      expect(result.deleted).toBeGreaterThanOrEqual(0);
      console.log(`✅ Cleaned up ${result.deleted} test memories`);
    });

    test("should delete test facts", async () => {
      const result = await client.mutation(api.cortexFacts.deleteMany, {
        memorySpaceId: testSpaceId,
      });
      
      expect(result.deleted).toBeGreaterThanOrEqual(0);
      console.log(`✅ Cleaned up ${result.deleted} test facts`);
    });
  });
});
