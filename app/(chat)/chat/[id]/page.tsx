import { auth } from "@/app/(auth)/auth";
import { Chat as PreviewChat } from "@/components/custom/chat";

// Guest user ID for unauthenticated access
const GUEST_USER_ID = "guest-user-00000000-0000-0000-0000-000000000000";

export default async function Page({ params }: { params: any }) {
  const { id } = params;
  const session = await auth();
  
  // AUTH BYPASS: Use guest user ID if no session
  const userId = session?.user?.id || GUEST_USER_ID;

  return (
    <PreviewChat
      id={id}
      initialMessages={[]}
      userId={userId}
    />
  );
}
