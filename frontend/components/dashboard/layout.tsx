'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn, getInitials } from '@/lib/utils';
import {
  Dna,
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  LogOut,
  Bell,
  ChevronDown,
  Shield,
  ClipboardList,
  FlaskConical,
  UserCheck,
  Activity,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Badge, ThemeToggle } from '@/components/ui';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

const navigationByRole: Record<string, NavItem[]> = {
  patient: [
    { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: 'My Records', href: '/dashboard/records', icon: <FileText className="h-5 w-5" /> },
    { label: 'New Assessment', href: '/assessment', icon: <ClipboardList className="h-5 w-5" /> },
    { label: 'Settings', href: '/dashboard/settings', icon: <Settings className="h-5 w-5" /> },
  ],
  counselor: [
    { label: 'Dashboard', href: '/dashboard/counselor', icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: 'Patients', href: '/dashboard/counselor/patients', icon: <Users className="h-5 w-5" /> },
    { label: 'Pending Reviews', href: '/dashboard/counselor/reviews', icon: <ClipboardList className="h-5 w-5" />, badge: 3 },
    { label: 'My License', href: '/dashboard/counselor/license', icon: <Shield className="h-5 w-5" /> },
    { label: 'Settings', href: '/dashboard/settings', icon: <Settings className="h-5 w-5" /> },
  ],
  researcher: [
    { label: 'Dashboard', href: '/dashboard/researcher', icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: 'Datasets', href: '/dashboard/researcher/datasets', icon: <FlaskConical className="h-5 w-5" /> },
    { label: 'Analytics', href: '/dashboard/researcher/analytics', icon: <Activity className="h-5 w-5" /> },
    { label: 'My License', href: '/dashboard/researcher/license', icon: <Shield className="h-5 w-5" /> },
    { label: 'Settings', href: '/dashboard/settings', icon: <Settings className="h-5 w-5" /> },
  ],
  admin: [
    { label: 'Dashboard', href: '/dashboard/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: 'Users', href: '/dashboard/admin/users', icon: <Users className="h-5 w-5" /> },
    { label: 'License Approvals', href: '/dashboard/admin/licenses', icon: <UserCheck className="h-5 w-5" />, badge: 5 },
    { label: 'Audit Logs', href: '/dashboard/admin/audit', icon: <ClipboardList className="h-5 w-5" /> },
    { label: 'System Health', href: '/dashboard/admin/system', icon: <Activity className="h-5 w-5" /> },
    { label: 'Settings', href: '/dashboard/settings', icon: <Settings className="h-5 w-5" /> },
  ],
};

export function DashboardSidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const navigation = navigationByRole[user.role] || navigationByRole.patient;

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-200 dark:border-gray-800">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Dna className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">ImmunoDetect</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <Badge variant="destructive" className="text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  getInitials(`${user.firstName} ${user.lastName}`)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-3 w-full px-3 py-2.5 mt-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

export function DashboardHeader() {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="lg:hidden w-10" /> {/* Spacer for mobile menu button */}
        
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white hidden lg:block">
            Welcome, {user?.firstName}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2">
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <p className="text-sm text-gray-900 dark:text-white">Your assessment results are ready</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">2 hours ago</p>
                  </div>
                  <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <p className="text-sm text-gray-900 dark:text-white">New counselor review available</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">1 day ago</p>
                  </div>
                </div>
                <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
                  <Link href="/dashboard/notifications" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User dropdown */}
          <div className="flex items-center gap-2 text-sm">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xs">
              {user && getInitials(`${user.firstName} ${user.lastName}`)}
            </div>
            <ChevronDown className="h-4 w-4 text-gray-500 hidden sm:block" />
          </div>
        </div>
      </div>
    </header>
  );
}
