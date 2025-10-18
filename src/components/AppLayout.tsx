import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Moon, Sun, Search, Server, Container, CreditCard, Activity, Settings, Home } from "lucide-react";
import { generateBreadcrumbs } from "@/lib/breadcrumbs";
import NotificationDropdown from "@/components/NotificationDropdown";
import { useTheme } from "@/hooks/useTheme";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [commandOpen, setCommandOpen] = useState(false);

  // Read sidebar state from cookie on initialization
  const defaultSidebarOpen = useMemo(() => {
    if (typeof window === "undefined") return true;
    const cookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("sidebar_state="));
    return cookie ? cookie.split("=")[1] !== "false" : true;
  }, []);

  // Generate breadcrumbs from current route
  const breadcrumbs = useMemo(
    () => generateBreadcrumbs(location.pathname),
    [location.pathname]
  );

  // Use the proper theme hook for persistence
  const { isDark, toggleTheme } = useTheme();

  // Command search keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Navigation items for command search
  const navigationItems = [
    {
      icon: Home,
      label: "Dashboard",
      href: "/dashboard",
      shortcut: "⌘D",
    },
    {
      icon: Server,
      label: "VPS Instances",
      href: "/vps",
      shortcut: "⌘V",
    },
    {
      icon: Container,
      label: "Containers",
      href: "/containers",
      shortcut: "⌘C",
    },
    {
      icon: CreditCard,
      label: "Billing",
      href: "/billing",
      shortcut: "⌘B",
    },
    {
      icon: Activity,
      label: "Activity",
      href: "/activity",
      shortcut: "⌘A",
    },
    {
      icon: Settings,
      label: "Settings",
      href: "/settings",
      shortcut: "⌘S",
    },
  ];

  const handleNavigate = (href: string) => {
    navigate(href);
    setCommandOpen(false);
  };

  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
      <AppSidebar />
      <SidebarInset>
        {/* Two-Tier Navigation Header */}
        <Card className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <CardContent className="flex h-16 shrink-0 items-center justify-between gap-2 px-4 py-0 group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={`${crumb.label}-${index}`}>
                      {index > 0 && <BreadcrumbSeparator />}
                      <BreadcrumbItem>
                        {crumb.isActive || !crumb.href ? (
                          <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink href={crumb.href}>
                            {crumb.label}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </React.Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Centered Search Bar */}
            <div className="flex-1 max-w-md mx-4">
              <Button
                variant="outline"
                className="w-full justify-start text-muted-foreground"
                onClick={() => setCommandOpen(true)}
              >
                <Search className="mr-2 h-4 w-4" />
                Search...
                <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <NotificationDropdown />
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9"
              >
                {isDark ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <Card className="flex-1">
          <CardContent className="flex flex-1 flex-col gap-4 p-4 pt-6">
            <main className="flex-1">
              {children}
            </main>
          </CardContent>
        </Card>

        {/* Command Dialog */}
        <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Navigation">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.href}
                    onSelect={() => handleNavigate(item.href)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                    <CommandShortcut>{item.shortcut}</CommandShortcut>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Actions">
              <CommandItem onSelect={toggleTheme}>
                {isDark ? (
                  <Sun className="mr-2 h-4 w-4" />
                ) : (
                  <Moon className="mr-2 h-4 w-4" />
                )}
                <span>Toggle theme</span>
                <CommandShortcut>⌘T</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AppLayout;