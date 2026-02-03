import { ChatInterface } from "@/components/chat/chat-interface";
import { generateUUID } from "@/lib/utils";

// Guest user ID for unauthenticated access
const GUEST_USER_ID = "guest-user-00000000-0000-0000-0000-000000000000";

export default function Page() {
  const id = generateUUID();

  return (
    <ChatInterface
      key={id}
      id={id}
      userId={GUEST_USER_ID}
    />
  );
}
