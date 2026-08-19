import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, Users, Scissors, UserCog, Sparkles,
  Package, FileText, Settings, LogOut, ShoppingBag
} from 'lucide-react';
import { cn } from '../../lib/utils';
import Logo from '../../assets/hingu-logo.jpeg';

const navItems = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Rate Master', href: '/ratemaster', icon: Sparkles },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Orders', href: '/orders', icon: ShoppingBag },
  { name: 'Employees', href: '/employees', icon: UserCog },
  { name: 'Stock', href: '/stock', icon: Package },
  { name: 'Accounts', href: '/accounts', icon: FileText },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar({ isMobileOpen, onClose }: { isMobileOpen?: boolean; onClose?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden animate-in fade-in"
          onClick={onClose}
        />
      )}
      <aside className={cn(
        "flex-col border-r bg-card select-none z-50 w-[300px]",
        isMobileOpen ? "fixed inset-y-0 left-0 flex animate-in slide-in-from-left" : "hidden md:flex sticky top-0 h-screen"
      )}>
      <div className="flex justify-center items-center border-b px-6 py-4">
        <NavLink to="/">
          <img src={Logo} alt="Hingu Tailors" className="w-32 h-auto object-contain" />
        </NavLink>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4 flex flex-col justify-between">
        <nav className="grid gap-1 px-4 text-sm font-medium">
          <div className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">
            Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || 
                             (item.href !== '/' && location.pathname.startsWith(item.href));
            
            return (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === '/'}
                onClick={() => onClose?.()}
                className={({ isActive: navActive }) => cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 transition-all duration-200 cursor-pointer",
                  (isActive || navActive)
                    ? "bg-primary/10 text-primary font-semibold shadow-sm" 
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                <span className="truncate">{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
        
      </div>
      </aside>
    </>
  );
}
