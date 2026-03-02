import { Suspense } from 'react';
import { getCurrentUser } from '@/actions/auth';
import { getNotifications } from '@/actions/notifications';
import { redirect } from 'next/navigation';
import { formatDateTime } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, CheckCheck, Mail, Clock, AlertTriangle } from 'lucide-react';
import { NotificationActions } from '@/components/shared/notification-actions';

export const dynamic = 'force-dynamic';

function getNotificationIcon(type: string) {
  switch (type) {
    case 'reminder_2hr':
    case 'reminder_30min':
      return <Clock className="h-5 w-5 text-amber-500" />;
    case 'reminder_15min':
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    case 'overdue':
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case 'booking_approved':
      return <CheckCheck className="h-5 w-5 text-green-500" />;
    case 'booking_rejected':
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    default:
      return <Bell className="h-5 w-5 text-blue-500" />;
  }
}

async function NotificationsList() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { data: notifications } = await getNotifications();

  if (!notifications?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Bell className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground">No notifications</h3>
        <p className="text-sm text-muted-foreground/70">You&apos;re all caught up!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notifications.map((n) => (
        <Card 
          key={n.id} 
          className={`transition-colors ${!n.is_read ? 'border-primary/30 bg-primary/5' : ''}`}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{getNotificationIcon(n.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm">{n.title}</h4>
                  {!n.is_read && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">NEW</Badge>
                  )}
                  {n.email_sent && (
                    <Mail className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{n.message}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {formatDateTime(n.created_at)}
                </p>
              </div>
              {!n.is_read && (
                <NotificationActions notificationId={n.id} />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default async function BorrowerNotificationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">Your booking updates & reminders</p>
        </div>
        <NotificationActions markAll />
      </div>

      <Suspense fallback={
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      }>
        <NotificationsList />
      </Suspense>
    </div>
  );
}
