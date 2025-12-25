// Removed Postgres user functions - Better Auth + Convex handles users
// Keep chat/reservation functions if still used, or migrate to Convex
import "server-only";

import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { chat, reservation } from "./schema";

// Lazy initialization - only connect if POSTGRES_URL is defined
let client: postgres.Sql | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!process.env.POSTGRES_URL) {
    return null;
  }
  if (!client) {
    client = postgres(`${process.env.POSTGRES_URL}?sslmode=require`);
    dbInstance = drizzle(client);
  }
  return dbInstance;
}

export async function saveChat({
  id,
  messages,
  userId,
}: {
  id: string;
  messages: any;
  userId: string;
}) {
  const db = getDb();
  if (!db) {
    console.warn("Database not configured, skipping saveChat");
    return null;
  }
  try {
    const selectedChats = await db.select().from(chat).where(eq(chat.id, id));

    if (selectedChats.length > 0) {
      return await db
        .update(chat)
        .set({
          messages: JSON.stringify(messages),
        })
        .where(eq(chat.id, id));
    }

    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      messages: JSON.stringify(messages),
      userId,
    });
  } catch (error) {
    console.error("Failed to save chat in database");
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  const db = getDb();
  if (!db) {
    console.warn("Database not configured, skipping deleteChatById");
    return null;
  }
  try {
    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error("Failed to delete chat by id from database");
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  const db = getDb();
  if (!db) {
    console.warn("Database not configured, returning empty array");
    return [];
  }
  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error("Failed to get chats by user from database");
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  const db = getDb();
  if (!db) {
    console.warn("Database not configured, returning null");
    return null;
  }
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error("Failed to get chat by id from database");
    throw error;
  }
}

// Reservation functions (if still used)
export async function createReservation({
  id,
  userId,
  details,
}: {
  id: string;
  userId: string;
  details: any;
}) {
  const db = getDb();
  if (!db) {
    console.warn("Database not configured, skipping createReservation");
    return null;
  }
  return await db.insert(reservation).values({
    id,
    createdAt: new Date(),
    userId,
    hasCompletedPayment: false,
    details: JSON.stringify(details),
  });
}

export async function getReservationById({ id }: { id: string }) {
  const db = getDb();
  if (!db) {
    console.warn("Database not configured, returning null");
    return null;
  }
  const [selectedReservation] = await db
    .select()
    .from(reservation)
    .where(eq(reservation.id, id));

  return selectedReservation;
}

export async function updateReservation({
  id,
  hasCompletedPayment,
}: {
  id: string;
  hasCompletedPayment: boolean;
}) {
  const db = getDb();
  if (!db) {
    console.warn("Database not configured, skipping updateReservation");
    return null;
  }
  return await db
    .update(reservation)
    .set({
      hasCompletedPayment,
    })
    .where(eq(reservation.id, id));
}
