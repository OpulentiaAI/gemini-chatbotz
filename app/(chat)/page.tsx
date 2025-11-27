import { Chat } from "@/components/custom/chat";
import { generateUUID } from "@/lib/utils";
import { auth } from "@/app/(auth)/auth";

// Guest user ID for unauthenticated access
const GUEST_USER_ID = "guest-user-00000000-0000-0000-0000-000000000000";

export default async function Page() {
  const id = generateUUID();
  const session = await auth();
  
  // AUTH BYPASS: Use guest user ID if no session
  const userId = session?.user?.id || GUEST_USER_ID;
  
  return (
    <Chat
      key={id}
      id={id}
      initialMessages={[]}
      userId={userId}
    />
  );
}
