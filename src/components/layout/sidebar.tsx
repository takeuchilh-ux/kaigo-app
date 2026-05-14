'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  Calendar, Route, Users, Car, UserCircle, MapPin,
  Settings, AlertTriangle, LogOut, Menu, X, UserCog, ChevronDown
} from 'lucide-react'
import { useState, useEffect } from 'react'
import type { UserRole } from '@/types'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
  badge?: boolean          // whether to show near-miss badge
  children?: { href: string; label: string }[]
}

const navItems: NavItem[] = [
  { href: '/calendar', label: 'カレンダー', icon: Calendar, roles: ['admin', 'staff', 'driver'] },
  { href: '/reservations/new', label: '予約作成', icon: Route, roles: ['admin', 'staff'] },
  { href: '/clients', label: '利用者管理', icon: Users, roles: ['admin', 'staff'] },
  { href: '/vehicles', label: '車両管理', icon: Car, roles: ['admin', 'staff'] },
  { href: '/drivers', label: 'ドライバー管理', icon: UserCircle, roles: ['admin', 'staff'] },
  { href: '/care-assistants', label: '介補士管理', icon: UserCog, roles: ['admin', 'staff'] },
  { href: '/destinations', label: '目的地管理', icon: MapPin, roles: ['admin', 'staff'] },
  { href: '/near-miss', label: 'ヒヤリハット', icon: AlertTriangle, roles: ['admin', 'staff', 'driver'], badge: true },
  {
    href: '/settings',
    label: '設定・マスタ',
    icon: Settings,
    roles: ['admin'],
    children: [
      { href: '/settings?tab=physical_condition', label: '身体状況区分' },
      { href: '/settings?tab=wheelchair_type', label: '車椅子種別' },
      { href: '/settings?tab=cancel_reason', label: 'キャンセル理由' },
      { href: '/settings?tab=service_content', label: '付添サービス内容' },
      { href: '/settings?tab=staff', label: '応対者・報告者' },
      { href: '/settings?tab=users', label: 'ユーザー管理' },
    ],
  },
]

interface SidebarProps {
  role: UserRole
  userName: string | null
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(pathname === '/settings')
  const [nearMissCount, setNearMissCount] = useState(0)
  const supabase = createClient()

  // Fetch unread near-miss count for admin/staff
  useEffect(() => {
    if (role === 'driver') return

    const lastRead = (typeof window !== 'undefined'
      ? localStorage.getItem('nearMissLastRead')
      : null) ?? '1970-01-01T00:00:00.000Z'

    // Initial count
    supabase
      .from('near_miss_reports')
      .select('id', { count: 'exact', head: true })
      .gt('created_at', lastRead)
      .then(({ count }) => setNearMissCount(count ?? 0))

    // Real-time: new report inserted → increment badge
    const channel = supabase
      .channel('near-miss-badge')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'near_miss_reports' },
        () => setNearMissCount(c => c + 1)
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [role])

  // Clear badge when visiting near-miss page
  useEffect(() => {
    if (pathname === '/near-miss' || pathname.startsWith('/near-miss/')) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('nearMissLastRead', new Date().toISOString())
      }
      setNearMissCount(0)
    }
  }, [pathname])

  const filteredNav = navItems.filter(item => item.roles.includes(role))

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const NavLinks = ({ onClose }: { onClose?: () => void }) => (
    <nav className="flex-1 overflow-y-auto py-4">
      {filteredNav.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        const hasChildren = item.children && item.children.length > 0
        const showBadge = item.badge && nearMissCount > 0 && role !== 'driver'

        if (hasChildren) {
          return (
            <div key={item.href}>
              <button
                onClick={() => setSettingsOpen(v => !v)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors w-full',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown className={cn('w-4 h-4 transition-transform', settingsOpen && 'rotate-180')} />
              </button>
              {settingsOpen && (
                <div className="bg-gray-50 border-l-2 border-blue-200 ml-4">
                  {item.children!.map(child => {
                    const childActive = pathname === '/settings' &&
                      (typeof window !== 'undefined'
                        ? new URLSearchParams(window.location.search).get('tab') === child.href.split('tab=')[1]
                        : false)
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onClose}
                        className={cn(
                          'flex items-center pl-7 pr-4 py-2.5 text-sm transition-colors',
                          childActive
                            ? 'text-blue-700 font-medium bg-blue-50'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        )}
                      >
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors',
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">{item.label}</span>
            {showBadge && (
              <span className="bg-red-500 text-white text-[10px] leading-none rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold px-1">
                {nearMissCount > 99 ? '99+' : nearMissCount}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 bg-white border-r border-gray-200 z-30">
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-200">
          <div className="bg-blue-600 rounded-lg p-2">
            <Car className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">介護タクシー</p>
            <p className="text-xs text-gray-500">管理システム</p>
          </div>
        </div>
        <NavLinks />
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{userName || 'ユーザー'}</p>
              <p className="text-xs text-gray-500">{role === 'admin' ? '管理者' : role === 'driver' ? 'ドライバー' : 'スタッフ'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
            ログアウト
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 rounded-lg p-1.5">
            <Car className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-gray-900">介護タクシー管理</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile badge on hamburger area */}
          {nearMissCount > 0 && role !== 'driver' && (
            <span className="bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold px-1">
              {nearMissCount > 99 ? '99+' : nearMissCount}
            </span>
          )}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-md text-gray-600 hover:bg-gray-100">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-20" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <aside
            className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-200 mt-14">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <UserCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500">{role === 'admin' ? '管理者' : role === 'driver' ? 'ドライバー' : 'スタッフ'}</p>
              </div>
            </div>
            <NavLinks onClose={() => setMobileOpen(false)} />
            <div className="border-t border-gray-200 p-4">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
              >
                <LogOut className="w-4 h-4" />
                ログアウト
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
