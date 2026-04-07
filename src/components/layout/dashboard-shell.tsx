"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Monitor,
  LayoutDashboard,
  Package,
  Calendar,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ClipboardList,
  Users,
  BarChart3,
  FileText,
  ChevronLeft,
} from "lucide-react";
import { signOut } from "@/actions/auth";
import type { Profile } from "@/types/database";
import { getInitials } from "@/lib/utils";
import { useRealtimeNotifications, useRealtimeEvent } from "@/hooks/use-realtime";
import { toast } from "sonner";

interface SidebarProps {
  user: Profile;
  children: React.ReactNode;
}

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },

  { href: "/admin/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/admin/equipment", label: "Equipment", icon: Package },
  { href: "/admin/calendar", label: "Calendar", icon: Calendar },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
];

const borrowerNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/book", label: "Book Equipment", icon: Calendar },
  { href: "/dashboard/bookings", label: "My Bookings", icon: ClipboardList },
  { href: "/dashboard/equipment", label: "Equipment", icon: Package },
];

export function DashboardShell({ user, children }: SidebarProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAdmin = user.role === "admin";
  const navItems = isAdmin ? adminNavItems : borrowerNavItems;

  // Real-time notification count
  const { unreadCount } = useRealtimeNotifications(user.id);

  // Listen for new notifications and show toast + browser notification
  const handleNewNotification = useCallback((data: any) => {
    if (!data) return;
    const notifType = data.type || '';
    const title = data.title || 'New Notification';
    const message = data.message || '';

    // Determine urgency for toast styling
    const isUrgent = notifType === 'reminder_15min' || notifType === 'overdue';

    // Show in-app toast
    if (isUrgent) {
      toast.error(title, {
        description: message,
        duration: 15000, // 15 seconds for urgent
        action: {
          label: 'View',
          onClick: () => {
            window.location.href = isAdmin ? '/admin/notifications' : '/dashboard/notifications';
          },
        },
      });
    } else {
      toast.info(title, {
        description: message,
        duration: 8000,
        action: {
          label: 'View',
          onClick: () => {
            window.location.href = isAdmin ? '/admin/notifications' : '/dashboard/notifications';
          },
        },
      });
    }

    // Show browser push notification (if permission granted)
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotif = new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        tag: `pmo-${data.id || Date.now()}`,
        requireInteraction: isUrgent,
      });
      browserNotif.onclick = () => {
        window.focus();
        window.location.href = isAdmin ? '/admin/notifications' : '/dashboard/notifications';
      };
    }

    // Play alert sound for urgent notifications
    if (isUrgent) {
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczIj2markup...');
        // Use a simple oscillator beep instead
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.3;
        osc.start();
        setTimeout(() => { osc.stop(); ctx.close(); }, 300);
      } catch (e) {
        // Audio not available, ignore
      }
    }
  }, [isAdmin]);

  useRealtimeEvent('new-notification', handleNewNotification);

  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-white transition-all duration-300 lg:relative lg:z-auto",
          collapsed ? "w-[70px]" : "w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-fsuu-blue-600">
                <Monitor className="h-5 w-5 text-white" />
              </div>
              <div className="truncate">
                <h2 className="text-sm font-bold text-fsuu-blue-800">PMO FSUU</h2>
                <p className="text-[10px] text-muted-foreground">Equipment System</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-fsuu-blue-600">
              <Monitor className="h-5 w-5 text-white" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform",
                collapsed && "rotate-180"
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" &&
                item.href !== "/dashboard" &&
                pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-fsuu-blue-50 text-fsuu-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    isActive ? "text-fsuu-blue-600" : "text-gray-400"
                  )}
                />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t p-3 min-h-[64px]">
          {mounted && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-gray-100",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs">
                      {getInitials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <div className="truncate text-left">
                      <p className="truncate text-sm font-medium">{user.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground capitalize">
                        {user.role}
                      </p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="font-medium">{user.full_name}</p>
                  <p className="text-xs font-normal text-muted-foreground">
                    {user.email}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form action={signOut}>
                    <button type="submit" className="flex w-full items-center gap-2">
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b bg-white px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3 ml-auto">
            <Link href={isAdmin ? "/admin/notifications" : "/dashboard/notifications"}>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
