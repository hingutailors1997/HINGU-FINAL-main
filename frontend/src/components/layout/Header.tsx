import { Bell, Menu, Search, Sun, Moon, Trash2 } from 'lucide-react';
import { useTheme } from '../theme-provider';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchNotifications, markNotificationsRead, deleteNotification } from '../../lib/api';
import { Link } from 'react-router-dom';
import { useGlobalSearch } from '../../contexts/GlobalSearchContext';

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { theme, setTheme } = useTheme();
  const { globalSearch, setGlobalSearch } = useGlobalSearch();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
  });

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  const markReadMutation = useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notificationRef]);

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && unreadCount > 0) {
      markReadMutation.mutate();
    }
  };

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-card px-6 justify-between shadow-sm z-10 relative">
      <div className="flex items-center gap-4 flex-1">
        <button onClick={onMenuClick} className="md:hidden p-2 -ml-2 rounded-md hover:bg-muted">
          <Menu className="h-5 w-5 text-muted-foreground" />
        </button>
        <div className="w-full max-w-md hidden md:flex items-center relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search current page..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full rounded-full bg-muted/50 pl-10 pr-4 py-2 text-sm border-transparent focus:bg-background focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="relative p-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
          ) : (
            <Moon className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
          )}
        </button>

        <div className="relative" ref={notificationRef}>
          <button 
            onClick={handleNotificationClick}
            className="relative p-2 rounded-full hover:bg-muted transition-colors mr-2"
          >
            <Bell className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-2 h-2 w-2 rounded-full bg-destructive border-2 border-card"></span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute -right-12 sm:right-0 mt-2 w-[300px] sm:w-80 max-w-[95vw] bg-card border rounded-lg shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                <span className="font-semibold text-sm">Notifications</span>
                {unreadCount > 0 && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{unreadCount} New</span>}
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notif: any) => (
                    <div key={notif.id} className={`p-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors ${!notif.isRead ? 'bg-primary/5' : ''}`}>
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <span className="text-sm font-medium pr-2">{notif.title}</span>
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <span className="text-[10px] text-muted-foreground">{new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMutation.mutate(notif.id);
                            }}
                            className="text-muted-foreground hover:text-rose-500 transition-colors p-1 rounded hover:bg-rose-50"
                            title="Delete notification"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
                )}
              </div>
              <div className="p-2 border-t bg-muted/10 text-center">
                <Link to="/system-logs" onClick={() => setShowNotifications(false)} className="text-xs text-primary font-medium hover:underline inline-block w-full">View all Activity</Link>
              </div>
            </div>
          )}
        </div>
        
        <div className="h-8 w-px bg-border mx-1"></div>

        <button className="flex items-center gap-2 p-1 pl-2 rounded-full hover:bg-muted transition-all">
          <div className="flex flex-col items-end hidden md:flex mr-1">
            <span className="text-sm font-medium leading-none">Admin</span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase mt-1 tracking-wider">Owner</span>
          </div>
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
            <span className="text-sm font-bold text-primary">A</span>
          </div>
        </button>
      </div>
    </header>
  );
}
