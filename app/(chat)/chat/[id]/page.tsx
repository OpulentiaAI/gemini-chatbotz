import { notFound } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import { Chat as PreviewChat } from "@/components/custom/chat";

export default async function Page({ params }: { params: any }) {
  const { id } = params;
  const session = await auth();

  if (!session || !session.user) {
    return notFound();
  }

  return (
    <PreviewChat
      id={id}
      initialMessages={[]}
      userId={session.user.id}
    />
  );
}
