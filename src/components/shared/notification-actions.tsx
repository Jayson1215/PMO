'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Check, CheckCheck } from 'lucide-react';
import { markNotificationRead, markAllNotificationsRead } from '@/actions/notifications';
import { toast } from 'sonner';

interface NotificationActionsProps {
  notificationId?: string;
  markAll?: boolean;
}

export function NotificationActions({ notificationId, markAll }: NotificationActionsProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (markAll) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            const result = await markAllNotificationsRead();
            if (result.success) {
              toast.success('All notifications marked as read');
              router.refresh();
            }
          });
        }}
      >
        <CheckCheck className="h-4 w-4 mr-2" />
        Mark all read
      </Button>
    );
  }

  if (notificationId) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            await markNotificationRead(notificationId);
            router.refresh();
          });
        }}
        title="Mark as read"
      >
        <Check className="h-4 w-4" />
      </Button>
    );
  }

  return null;
}
