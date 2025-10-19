import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Activity,
  Box,
  Boxes,
  CreditCard,
  FileCode,
  Globe,
  LayoutDashboard,
  LifeBuoy,
  Palette,
  Search,
  Server,
  ServerCog,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { BRAND_NAME } from "@/lib/brand";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onOpenCommand?: () => void;
}

export function AppSidebar({ onOpenCommand, ...props }: AppSidebarProps) {
  const location = useLocation();
  const { user } = useAuth();

  // Main navigation items
  const pathname = location.pathname;
  const currentHash = location.hash?.slice(1) ?? "";
  const isDashboardActive = pathname === "/dashboard";
  const isVpsActive = pathname.startsWith("/vps");
  const isContainersActive = pathname.startsWith("/containers");
  const isActivityActive = pathname.startsWith("/activity");
  const isBillingActive = pathname.startsWith("/billing");
  const isAdminRoute = pathname.startsWith("/admin");

  const navMainItems = React.useMemo(
    () => {
      if (isAdminRoute) {
        const activeAnchor = currentHash || "support";
        const adminItems = [
          { title: "Support", anchor: "support", icon: LifeBuoy },
          { title: "VPS Plans", anchor: "vps-plans", icon: CreditCard },
          { title: "Container Plans", anchor: "container-plans", icon: Boxes },
          { title: "Containers", anchor: "containers", icon: Box },
          { title: "Servers", anchor: "servers", icon: ServerCog },
          { title: "Providers", anchor: "providers", icon: Settings },
          { title: "StackScripts", anchor: "stackscripts", icon: FileCode },
          { title: "Networking", anchor: "networking", icon: Globe },
          { title: "Theme", anchor: "theme", icon: Palette },
          { title: "User Management", anchor: "user-management", icon: Users },
        ];

        return adminItems.map((item) => ({
          title: item.title,
          url: `/admin#${item.anchor}`,
          icon: item.icon,
          isActive: activeAnchor === item.anchor,
        }));
      }

      return [
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
    },
    [
      currentHash,
      isActivityActive,
      isAdminRoute,
      isBillingActive,
      isContainersActive,
      isDashboardActive,
      isVpsActive,
    ],
  );

  // Secondary navigation items
  const navSecondaryItems: Array<{
    title: string;
    url: string;
    icon: LucideIcon;
  }> = React.useMemo(() => {
    if (isAdminRoute) {
      return [];
    }

    return [];
  }, [isAdminRoute]);

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
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="gap-4 border-b border-white/10 bg-sidebar-background/80 p-4 pointer-events-none">
        <SidebarMenu className="pointer-events-auto">
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="group-data-[collapsible=icon]:-ml-1.5"
              asChild
            >
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
        {onOpenCommand ? (
          <div className="px-2 pt-2 pb-1 md:hidden">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              onClick={onOpenCommand}
            >
              <Search className="mr-2 h-4 w-4" />
              Search...
              <Kbd className="ml-auto">⌘K</Kbd>
            </Button>
          </div>
        ) : null}
        <NavMain items={navMainItems} label={isAdminRoute ? "Admin" : undefined} />
        {navSecondaryItems.length > 0 ? (
          <NavSecondary items={navSecondaryItems} className="mt-auto" />
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  );
}