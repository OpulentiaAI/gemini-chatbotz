import { Chat } from "@/components/custom/chat";
import { generateUUID } from "@/lib/utils";

// Guest user ID for unauthenticated access
const GUEST_USER_ID = "guest-user-00000000-0000-0000-0000-000000000000";

export default function Page() {
  const id = generateUUID();

  return (
    <Chat
      key={id}
      id={id}
      initialMessages={[]}
      userId={GUEST_USER_ID}
    />
  );
}
