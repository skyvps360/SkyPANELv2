import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Activity,
  Container,
  CreditCard,
  HelpCircle,
  LayoutDashboard,
  Server,
  Settings,
  Shield,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";

const navigationItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "VPS", href: "/vps", icon: Server },
  { name: "Containers", href: "/containers", icon: Container },
  { name: "Activity", href: "/activity", icon: Activity },
  { name: "Billing", href: "/billing", icon: CreditCard },
  { name: "Support", href: "/support", icon: HelpCircle },
  { name: "Settings", href: "/settings", icon: Settings },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar_collapsed");
    setCollapsed(stored === "1");
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar_collapsed", next ? "1" : "0");
  };

  const items = user?.role === "admin"
    ? [...navigationItems, { name: "Admin", href: "/admin", icon: Shield }]
    : navigationItems;

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside
      className={`hidden min-h-[calc(100vh-4rem)] border-r bg-card md:block transition-[width] duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <TooltipProvider>
        <div className="flex h-full flex-col py-6">
          <div className="flex items-center justify-between px-4">
            <span
              className={`text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-opacity ${
                collapsed ? "opacity-0" : "opacity-100"
              }`}
            >
              Navigation
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                {collapsed ? <polyline points="9 18 15 12 9 6" /> : <polyline points="15 18 9 12 15 6" />}
              </svg>
            </Button>
          </div>

          <nav className="mt-6 flex-1 space-y-1 px-2">
            {items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const button = (
                <Button
                  key={item.name}
                  asChild
                  variant={active ? "secondary" : "ghost"}
                  className={`w-full ${collapsed ? "justify-center px-0" : "justify-start gap-3 px-3"}`}
                >
                  <Link to={item.href}>
                    <Icon className="h-4 w-4" />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                </Button>
              );

              if (!collapsed) {
                return button;
              }

              return (
                <Tooltip key={item.name} delayDuration={200}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </nav>
        </div>
      </TooltipProvider>
    </aside>
  );
};

export default Sidebar;