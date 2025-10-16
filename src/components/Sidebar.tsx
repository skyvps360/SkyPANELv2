import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Container,
  Server,
  CreditCard,
  HelpCircle,
  Settings,
  Activity,
  Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState<boolean>(false);

  useEffect(() => {
    const stored = localStorage.getItem('sidebar_collapsed');
    setCollapsed(stored === '1');
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar_collapsed', next ? '1' : '0');
  };

  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'VPS', href: '/vps', icon: Server },
    { name: 'Containers', href: '/containers', icon: Container },
    { name: 'Activity', href: '/activity', icon: Activity },
    { name: 'Billing', href: '/billing', icon: CreditCard },
    { name: 'Support', href: '/support', icon: HelpCircle },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const items = user?.role === 'admin'
    ? [...navigationItems, { name: 'Admin', href: '/admin', icon: Shield }]
    : navigationItems;

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className={`hidden md:block ${collapsed ? 'w-16' : 'w-64'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 min-h-[calc(100vh-4rem)] transition-all duration-300 ease-in-out`}>
      <div className={`${collapsed ? 'py-2 px-1' : 'p-4'} transition-all duration-300`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} mb-6`}>
          <div className={`text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold tracking-wider transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
            Navigation
          </div>
          <button
            onClick={toggleCollapsed}
            className={`rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 hover:scale-105 ${collapsed ? 'mx-auto' : ''}`}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              // chevron right
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 transition-transform duration-200"><path d="M9 6l6 6-6 6"/></svg>
            ) : (
              // chevron left
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 transition-transform duration-200"><path d="M15 6l-6 6 6 6"/></svg>
            )}
          </button>
        </div>
        <nav className="space-y-2">
          {items.map((item) => {
            const Icon = item.icon as any;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center ${collapsed ? 'justify-center mx-1 px-0' : 'px-3'} py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-[1.02] ${
                  active
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`}
                title={collapsed ? item.name : undefined}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 transition-all duration-200 ${collapsed ? '' : 'mr-3'} ${active ? 'text-blue-700 dark:text-blue-300' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`} />
                <span className={`transition-all duration-300 ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;