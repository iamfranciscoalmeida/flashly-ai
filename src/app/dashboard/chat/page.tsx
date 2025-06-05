import { createClient } from "@/supabase/server";
import { redirect } from "next/navigation";
import { ChatPageClient } from "./chat-page-client";

export default async function ChatPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Get user's documents
  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Get user's chat sessions
  const { data: sessions } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("last_message_at", { ascending: false })
    .limit(10);

  return (
    <ChatPageClient 
      initialDocuments={documents || []}
      initialSessions={sessions || []}
      userId={user.id}
    />
  );
}