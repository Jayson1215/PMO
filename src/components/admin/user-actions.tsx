"use client";

import { useState, useTransition } from "react";
import { 
  Trash2, 
  MoreVertical, 
  ShieldAlert,
  Loader2
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteUser, updateUserRole } from "@/actions/users";
import { toast } from "sonner";

interface UserActionsProps {
  userId: string;
  userName: string;
  userRole: string;
  currentUserEmail: string;
  userEmail: string;
}

export function UserActions({ 
  userId, 
  userName, 
  userRole, 
  currentUserEmail,
  userEmail 
}: UserActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isUpdating, startUpdateTransition] = useTransition();

  const isSelf = currentUserEmail === userEmail;

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteUser(userId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("User deleted successfully");
        setShowDeleteDialog(false);
      }
    });
  }

  function handleToggleRole() {
    const newRole = userRole === 'admin' ? 'borrower' : 'admin';
    startUpdateTransition(async () => {
      const result = await updateUserRole(userId, newRole);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`User role updated to ${newRole}`);
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onClick={handleToggleRole}
            disabled={isUpdating || isSelf}
          >
            {isUpdating ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <ShieldAlert className="mr-2 h-3 w-3" />
            )}
            Make {userRole === 'admin' ? 'Borrower' : 'Admin'}
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="text-red-600 focus:text-red-600"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isSelf}
          >
            <Trash2 className="mr-2 h-3 w-3" />
            Delete Account
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete User Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{userName}</strong> ({userEmail})? 
              This action cannot be undone and will permanently remove their access and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
