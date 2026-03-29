import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardSidebar } from '@/components/features/workspace/DashboardSidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch profile for display name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar
        userName={profile?.full_name ?? user.user_metadata?.full_name}
        userEmail={user.email}
        userAvatarUrl={profile?.avatar_url ?? user.user_metadata?.avatar_url}
      />
      <main className="lg:pl-60 min-h-screen">
        {children}
      </main>
    </div>
  )
}
