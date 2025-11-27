import { Chat } from "@/components/custom/chat";
import { generateUUID } from "@/lib/utils";
import { auth } from "@/app/(auth)/auth";

export default async function Page() {
  const id = generateUUID();
  const session = await auth();
  return (
    <Chat
      key={id}
      id={id}
      initialMessages={[]}
      userId={session?.user?.id}
    />
  );
}
