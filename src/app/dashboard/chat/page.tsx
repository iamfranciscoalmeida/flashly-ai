import { createClient } from "@/supabase/server";
import { redirect } from "next/navigation";
import { YouLearnChatPage } from "./youlearn-chat-page";

export default async function ChatPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  return <YouLearnChatPage userId={user.id} />;
}