'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import {
  Camera,
  CreditCard,
  FolderOpen,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { Avatar } from '@/components/common'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Projects', href: '/dashboard', icon: FolderOpen },
  { label: 'Billing', href: '/dashboard/billing', icon: CreditCard },
]

export interface DashboardSidebarProps {
  userName?: string
  userEmail?: string
  userAvatarUrl?: string
}

export function DashboardSidebar({
  userName,
  userEmail,
  userAvatarUrl,
}: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
          <Camera className="w-4 h-4 text-accent" />
        </div>
        <span className="text-sm font-semibold text-white tracking-tight">
          View1 Studio
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => {
                e.preventDefault()
                setMobileOpen(false)
                router.push(item.href)
              }}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-accent/10 text-accent'
                  : 'text-white/50 hover:text-white hover:bg-white/5',
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </a>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-view1-border px-3 py-3 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar
            src={userAvatarUrl}
            name={userName ?? userEmail ?? 'User'}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {userName ?? 'User'}
            </p>
            {userEmail && (
              <p className="text-xs text-muted truncate">{userEmail}</p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        aria-label="Open navigation"
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-surface border border-view1-border text-white/70 hover:text-white lg:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-60 bg-surface border-r border-view1-border transform transition-transform duration-200 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <button
          type="button"
          aria-label="Close navigation"
          className="absolute top-4 right-4 p-1 rounded-lg text-white/50 hover:text-white"
          onClick={() => setMobileOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 bg-surface border-r border-view1-border">
        {sidebarContent}
      </aside>
    </>
  )
}
