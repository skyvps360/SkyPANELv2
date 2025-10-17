import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Activity,
  CreditCard,
  HelpCircle,
  LayoutDashboard,
  Server,
  Command,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { BRAND_NAME } from "@/lib/brand";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();
  const { user } = useAuth();

  // Main navigation items
  const pathname = location.pathname;
  const isDashboardActive = pathname === "/dashboard";
  const isVpsActive = pathname.startsWith("/vps");
  const isContainersActive = pathname.startsWith("/containers");
  const isActivityActive = pathname.startsWith("/activity");
  const isBillingActive = pathname.startsWith("/billing");

  const navMainItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: isDashboardActive,
    },
    {
      title: "Compute",
      url: isVpsActive ? "/vps" : isContainersActive ? "/containers" : "/vps",
      icon: Server,
      isActive: isVpsActive || isContainersActive,
      items: [
        {
          title: "VPS",
          url: "/vps",
          isActive: isVpsActive,
        },
        {
          title: "Containers",
          url: "/containers",
          isActive: isContainersActive,
        },
      ],
    },
    {
      title: "Activity",
      url: "/activity",
      icon: Activity,
      isActive: isActivityActive,
    },
    {
      title: "Billing",
      url: "/billing",
      icon: CreditCard,
      isActive: isBillingActive,
    },
  ];

  // Secondary navigation items
  const navSecondaryItems = [
    {
      title: "Support",
      url: "/support",
      icon: HelpCircle,
    },
  ];

  // User data for the footer
  const displayName = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email
    : "User";

  const userData = {
    name: displayName,
    email: user?.email || "user@example.com",
    avatar: "/avatars/user.jpg", // You can add user avatar support later
    role: user?.role,
  };

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Server className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{BRAND_NAME}</span>
                  <span className="truncate text-xs">Cloud Platform</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
        <NavSecondary items={navSecondaryItems} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  );
}