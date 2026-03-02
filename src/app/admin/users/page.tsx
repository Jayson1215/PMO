export default function AdminUsersPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-muted-foreground">
          View and manage registered users
        </p>
      </div>
      <div className="rounded-lg border bg-white p-8 text-center">
        <p className="text-muted-foreground">
          User management features — view user list from Supabase Auth dashboard, 
          or integrate directly here via the Admin API.
        </p>
      </div>
    </div>
  );
}
