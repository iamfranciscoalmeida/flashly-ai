import { createClient } from '../../../../supabase/server'
import { redirect } from 'next/navigation'
import SimpleChat from './simple-chat'

export default async function ChatPage() {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/sign-in')
  }

  return <SimpleChat />
} 