import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchNotifications, deleteNotification, markNotificationsRead } from '../lib/api';
import { Bell, Trash2 } from 'lucide-react';

export default function SystemLogs() {
  const queryClient = useQueryClient();
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const previousNotifications = queryClient.getQueryData(['notifications']);
      queryClient.setQueryData(['notifications'], (old: any) => 
        old ? old.filter((n: any) => (n.id || n._id) !== deletedId) : []
      );
      return { previousNotifications };
    },
    onError: (err, newTodo, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications'], context.previousNotifications);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Activity Logs</h1>
            <p className="text-sm text-muted-foreground">View all system events and notifications.</p>
          </div>
        </div>
      </div>
      
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading</div>
        ) : (!notifications || notifications.length === 0) ? (
          <div className="p-8 text-center text-muted-foreground">No activity logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">Timestamp</th>
                  <th className="px-6 py-3 font-medium">Event</th>
                  <th className="px-6 py-3 font-medium">Details</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {notifications.map((notif: any) => (
                  <tr key={notif.id || notif._id} className={`transition-colors ${!notif.isRead ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/30'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(notif.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4 font-medium">{notif.title}</td>
                    <td className="px-6 py-4 text-muted-foreground">{notif.message}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => deleteMutation.mutate(notif.id || notif._id)}
                        className="p-2 text-muted-foreground hover:text-rose-500 rounded hover:bg-rose-50 transition-colors inline-block"
                        title="Delete log"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
