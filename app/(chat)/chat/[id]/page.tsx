import { ChatInterface } from "@/components/chat/chat-interface";

// Guest user ID for unauthenticated access
const GUEST_USER_ID = "guest-user-00000000-0000-0000-0000-000000000000";

export default async function Page({ params }: { params: any }) {
  const { id } = params;
  const userId = GUEST_USER_ID;

  return (
    <ChatInterface
      id={id}
      initialMessages={[]}
      userId={userId}
    />
  );
}
