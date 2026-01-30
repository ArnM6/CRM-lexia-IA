
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Users, Inbox, Contact, Settings, LogOut, ChevronDown, ChevronRight, PieChart, Briefcase, X } from 'lucide-react';
import { cn, getInitials } from '../lib/utils';
import { ThemeToggle } from './ui/ThemeToggle';
import { authService } from '../services/auth';
import { User } from '../types';

interface NavItem {
    icon: React.ElementType;
    label: string;
    path: string;
    subItems?: { label: string; path: string; icon: React.ElementType }[];
}

const NAV_STRUCTURE: NavItem[] = [
  { 
      icon: LayoutDashboard, 
      label: 'Dashboard', 
      path: '/',
      subItems: [
          { label: 'Overview', path: '/', icon: PieChart },
          { label: 'Pipeline', path: '/kanban', icon: FolderKanban },
          { label: 'Entreprises', path: '/directory', icon: Users },
          { label: 'Annuaire', path: '/annuaire', icon: Contact },
      ]
  },
  { icon: Inbox, label: 'Inbox', path: '/inbox' },
  { icon: Briefcase, label: 'Toolbox', path: '/toolbox' },
];

interface AppSidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  // State for collapsible menus (default open for Dashboard)
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
      'Dashboard': true
  });

  // Real notification count
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const refreshUser = () => {
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
            setUser(currentUser);
        }
    };
    
    refreshUser();

    // Listen for updates from Settings or Login
    window.addEventListener('user-updated', refreshUser);
    
    // Listen for inbox badge updates
    const handleBadgeUpdate = (e: CustomEvent) => {
        setUnreadCount(e.detail);
    };
    window.addEventListener('inbox-badge-update', handleBadgeUpdate as EventListener);

    return () => {
        window.removeEventListener('user-updated', refreshUser);
        window.removeEventListener('inbox-badge-update', handleBadgeUpdate as EventListener);
    };
  }, []);

  const handleLogout = () => {
      authService.logout();
      navigate('/login');
  };

  const toggleMenu = (label: string) => {
      setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLinkClick = () => {
      if (window.innerWidth < 768 && onClose) {
          onClose();
      }
  };

  return (
    <>
        {/* Mobile Overlay */}
        <div 
            className={cn(
                "fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm transition-opacity md:hidden",
                isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            onClick={onClose}
        />

        <aside 
            className={cn(
                "fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 flex flex-col text-slate-900 dark:text-slate-100 transition-transform duration-300 ease-in-out md:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}
        >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6 dark:border-slate-800">
            <Link to="/" className="flex items-center gap-2" onClick={handleLinkClick}>
                {user?.customAppLogo ? (
                    <img 
                        src={user.customAppLogo} 
                        alt="Custom Logo" 
                        className="h-8 w-auto object-contain dark:invert"
                    />
                ) : !imgError ? (
                    <img 
                        src="/logo-lexia.png" 
                        alt="Lexia" 
                        className="h-8 w-auto object-contain dark:invert" 
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div className="flex items-center gap-2 font-bold text-xl text-primary">
                        <div className="h-8 w-8 rounded bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white">
                            L
                        </div>
                        <span>Lexia</span>
                    </div>
                )}
            </Link>
            <button onClick={onClose} className="md:hidden text-slate-500">
                <X className="h-5 w-5" />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3">
            <nav className="space-y-1">
            {NAV_STRUCTURE.map((item) => {
                const Icon = item.icon;
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isExpanded = expandedMenus[item.label];
                // Check if any sub-item is active
                const isChildActive = hasSubItems && item.subItems?.some(sub => location.pathname === sub.path);
                const isDirectActive = location.pathname === item.path;
                
                return (
                <div key={item.label} className="mb-1">
                    {hasSubItems ? (
                        <button
                            onClick={() => toggleMenu(item.label)}
                            className={cn(
                            "w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            isChildActive || isExpanded
                                ? "text-slate-900 dark:text-slate-100"
                                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <Icon className={cn("h-5 w-5", isChildActive ? "text-orange-600" : "text-slate-400")} />
                                {item.label}
                            </div>
                            {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                        </button>
                    ) : (
                        <Link
                            to={item.path}
                            onClick={handleLinkClick}
                            className={cn(
                            "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            isDirectActive
                                ? "bg-orange-50 text-orange-700 dark:bg-slate-800 dark:text-orange-500"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <Icon className={cn("h-5 w-5", isDirectActive ? "text-orange-600" : "text-slate-400")} />
                                {item.label}
                            </div>
                            {item.label === 'Inbox' && unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center shadow-sm">
                                    {unreadCount}
                                </span>
                            )}
                        </Link>
                    )}

                    {/* Sub Menu */}
                    {hasSubItems && isExpanded && (
                        <div className="mt-1 ml-4 pl-4 border-l border-slate-200 dark:border-slate-800 space-y-1">
                            {item.subItems?.map((sub) => {
                                const isSubActive = location.pathname === sub.path;
                                return (
                                    <Link
                                        key={sub.path}
                                        to={sub.path}
                                        onClick={handleLinkClick}
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                            isSubActive
                                                ? "bg-orange-50 text-orange-700 dark:bg-slate-800 dark:text-orange-500"
                                                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50"
                                        )}
                                    >
                                        <span>{sub.label}</span>
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </div>
                );
            })}
            </nav>

            <div className="mt-8 px-3">
                <h4 className="mb-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-500">Settings</h4>
                <ThemeToggle />
                <Link to="/settings" onClick={handleLinkClick} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50">
                    <Settings className="h-5 w-5" />
                    Preferences
                </Link>
            </div>
        </div>

        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm overflow-hidden dark:bg-slate-700 dark:text-slate-200">
                        {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                        ) : (
                            getInitials(user?.name || 'User')
                        )}
                    </div>
                    <span 
                        className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500"
                        title="Local Database"
                    />
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{user?.name || 'Guest'}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email || 'Sign in'}</p>
                </div>
                <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 p-1" title="Log out">
                    <LogOut className="h-5 w-5" />
                </button>
            </div>
        </div>
        </aside>
    </>
  );
};
