import React, { useEffect, useMemo, useState, useCallback } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Moon, Sun, Search, Server, Container, CreditCard, Activity, Settings, Home, MessageCircle, Loader2, HelpCircle } from "lucide-react";
import { generateBreadcrumbs } from "@/lib/breadcrumbs";
import NotificationDropdown from "@/components/NotificationDropdown";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import type { VPSInstance } from "@/types/vps";

// Container interface based on the Containers.tsx structure
interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: 'running' | 'stopped' | 'paused' | 'restarting' | 'error';
  created: string;
  ports: string[];
  volumes: string[];
  environment: Record<string, string>;
  stats: {
    cpu: number;
    memory: number;
    network: {
      rx: number;
      tx: number;
    };
    uptime: string;
  };
}

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [commandOpen, setCommandOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  
  // State for VPS and Container search
  const [vpsInstances, setVpsInstances] = useState<VPSInstance[]>([]);
  const [containers, setContainers] = useState<ContainerInfo[]>([]);
  const [vpsLoading, setVpsLoading] = useState(false);
  const [containersLoading, setContainersLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Read sidebar state from cookie on initialization
  const getSidebarPreference = useCallback(() => {
    if (typeof window === "undefined") {
      return true;
    }

    const cookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("sidebar_state="));

    return cookie ? cookie.split("=")[1] !== "false" : true;
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => getSidebarPreference());

  useEffect(() => {
    setIsSidebarOpen(getSidebarPreference());
  }, [getSidebarPreference]);

  // Generate breadcrumbs from current route
  const breadcrumbs = useMemo(
    () => generateBreadcrumbs(location.pathname),
    [location.pathname]
  );

  // Use the proper theme hook for persistence
  const { isDark, toggleTheme } = useTheme();

  // Fetch VPS instances
  const fetchVPSInstances = useCallback(async () => {
    if (!token) return;
    
    setVpsLoading(true);
    try {
      const res = await fetch('/api/vps', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load VPS instances');

      const mapped: VPSInstance[] = (payload.instances || []).map((i: any) => ({
        id: i.id,
        label: i.label,
        status: ((i.status as any) || 'provisioning') === 'offline' ? 'stopped' : ((i.status as any) || 'provisioning'),
        type: i.configuration?.type || '',
        region: i.configuration?.region || '',
        regionLabel: i.region_label || undefined,
        image: i.configuration?.image || '',
        ipv4: i.ip_address ? [i.ip_address] : [],
        ipv6: '',
        created: i.created_at,
        specs: {
          vcpus: Number(i.plan_specs?.vcpus || 0),
          memory: Number(i.plan_specs?.memory || 0),
          disk: Number(i.plan_specs?.disk || 0),
          transfer: Number(i.plan_specs?.transfer || 0),
        },
        stats: { cpu: 0, memory: 0, disk: 0, network: { in: 0, out: 0 }, uptime: '' },
        pricing: {
          hourly: Number(i.plan_pricing?.hourly || 0),
          monthly: Number(i.plan_pricing?.monthly || 0),
        }
      }));

      setVpsInstances(mapped);
    } catch (error: any) {
      console.error('Failed to load VPS instances:', error);
    } finally {
      setVpsLoading(false);
    }
  }, [token]);

  // Fetch containers
  const fetchContainers = useCallback(async () => {
    if (!token) return;
    
    setContainersLoading(true);
    try {
      const res = await fetch('/api/containers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load containers');

      const mapped: ContainerInfo[] = (payload.containers || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        image: c.image,
        status: (c.status as any) || 'stopped',
        created: c.created_at,
        ports: c.config?.ports ?? [],
        volumes: c.config?.volumes ?? [],
        environment: c.config?.environment ?? {},
        stats: { cpu: 0, memory: 0, network: { rx: 0, tx: 0 }, uptime: '' }
      }));

      setContainers(mapped);
    } catch (error: any) {
      console.error('Failed to load containers:', error);
    } finally {
      setContainersLoading(false);
    }
  }, [token]);

  // Fetch data when command dialog opens (lazy loading)
  useEffect(() => {
    if (commandOpen && !dataLoaded && token) {
      setDataLoaded(true);
      fetchVPSInstances();
      fetchContainers();
    }
  }, [commandOpen, dataLoaded, token, fetchVPSInstances, fetchContainers]);

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
      icon: CreditCard,
      label: "Invoices",
      href: "/billing/invoices",
      shortcut: "⌘I",
    },
    {
      icon: Activity,
      label: "Activity",
      href: "/activity",
      shortcut: "⌘A",
    },
    {
      icon: MessageCircle,
      label: "Support",
      href: "/support",
      shortcut: "⌘H",
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

  // Helper function to get status color for VPS
  const getVPSStatusColor = (status: string): string => {
    switch (status) {
      case 'running':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'stopped':
        return 'text-muted-foreground bg-gray-100 dark:bg-gray-800';
      case 'provisioning':
        return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20';
      case 'rebooting':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'error':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      default:
        return 'text-muted-foreground bg-gray-100 dark:bg-gray-800';
    }
  };

  // Helper function to get status color for containers
  const getContainerStatusColor = (status: string): string => {
    switch (status) {
      case 'running':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'stopped':
        return 'text-muted-foreground bg-gray-100 dark:bg-gray-800';
      case 'paused':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'restarting':
        return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20';
      case 'error':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      default:
        return 'text-muted-foreground bg-gray-100 dark:bg-gray-800';
    }
  };

  return (
    <SidebarProvider
      defaultOpen={isSidebarOpen}
      open={isSidebarOpen}
      onOpenChange={setIsSidebarOpen}
    >
      <AppSidebar onOpenCommand={() => setCommandOpen(true)} />
      <SidebarInset>
        {/* Two-Tier Navigation Header */}
        <Card className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear">
          <CardContent className="flex h-16 shrink-0 items-center justify-between gap-2 px-4 py-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              
              <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
              <div className="hidden md:block">
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

            </div>

            <div className="flex items-center gap-2 ml-auto">
              {/* Search Bar - Desktop-only command palette trigger */}
              <div className="hidden md:block max-w-md">
                <Button
                  variant="outline"
                  className="w-full justify-start text-muted-foreground min-w-[200px]"
                  onClick={() => setCommandOpen(true)}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Search...
                  <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </Button>
              </div>
              
              <NotificationDropdown />
              
              {/* Keyboard Help Menu */}
              <Popover open={helpOpen} onOpenChange={setHelpOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                  >
                    <HelpCircle className="h-4 w-4" />
                    <span className="sr-only">Keyboard shortcuts</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Keyboard Shortcuts</h4>
                      <p className="text-sm text-muted-foreground">
                        Quick access to common actions
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Toggle sidebar</span>
                        <Kbd>Ctrl+B</Kbd>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Open command palette</span>
                        <Kbd>Ctrl+K</Kbd>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
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
           <CommandInput placeholder="Type a command or search for a server..." />
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
             
             {/* VPS Instances Group */}
             {(vpsInstances.length > 0 || vpsLoading) && (
               <>
                 <CommandSeparator />
                 <CommandGroup heading="VPS Instances">
                   {vpsLoading ? (
                     <CommandItem disabled>
                       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                       <span>Loading VPS instances...</span>
                     </CommandItem>
                   ) : (
                     vpsInstances.map((vps) => (
                       <CommandItem
                         key={vps.id}
                         onSelect={() => handleNavigate(`/vps/${vps.id}`)}
                         className="flex items-center justify-between"
                       >
                         <div className="flex items-center">
                           <Server className="mr-2 h-4 w-4" />
                           <div className="flex flex-col">
                             <span className="font-medium">{vps.label}</span>
                             <div className="flex items-center gap-2 text-xs text-muted-foreground">
                               <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getVPSStatusColor(vps.status)}`}>
                                 {vps.status}
                               </span>
                               {vps.ipv4.length > 0 && (
                                 <span>{vps.ipv4[0]}</span>
                               )}
                               {vps.regionLabel && (
                                 <span>{vps.regionLabel}</span>
                               )}
                             </div>
                           </div>
                         </div>
                       </CommandItem>
                     ))
                   )}
                 </CommandGroup>
               </>
             )}

             {/* Containers Group */}
             {(containers.length > 0 || containersLoading) && (
               <>
                 <CommandSeparator />
                 <CommandGroup heading="Containers">
                   {containersLoading ? (
                     <CommandItem disabled>
                       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                       <span>Loading containers...</span>
                     </CommandItem>
                   ) : (
                     containers.map((container) => (
                       <CommandItem
                         key={container.id}
                         onSelect={() => handleNavigate('/containers')}
                         className="flex items-center justify-between"
                       >
                         <div className="flex items-center">
                           <Container className="mr-2 h-4 w-4" />
                           <div className="flex flex-col">
                             <span className="font-medium">{container.name}</span>
                             <div className="flex items-center gap-2 text-xs text-muted-foreground">
                               <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getContainerStatusColor(container.status)}`}>
                                 {container.status}
                               </span>
                               <span className="truncate max-w-[200px]">{container.image}</span>
                             </div>
                           </div>
                         </div>
                       </CommandItem>
                     ))
                   )}
                 </CommandGroup>
               </>
             )}

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