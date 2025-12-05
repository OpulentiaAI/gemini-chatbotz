import { getChatsByUserId } from "@/db/queries";

// Guest user ID for unauthenticated access
const GUEST_USER_ID = "guest-user-00000000-0000-0000-0000-000000000000";

export async function GET() {
  const userId = GUEST_USER_ID;

  try {
    const chats = await getChatsByUserId({ id: userId });
    return Response.json(chats);
  } catch (error) {
    console.error("Failed to get chat history (guest mode):", error);
    return Response.json([]);
  }
}
