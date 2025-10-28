/**
 * Admin Dashboard
 * Manage support tickets and VPS plans
 */
import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  DollarSign,
  Edit,
  FileCode,
  Globe,
  Palette,
  Plus,
  RefreshCw,
  Search,
  Server,
  ServerCog,
  Settings,
  Ticket,
  Trash2,
  Users,
  X,
  Box,
  Boxes,
  Shield,
  Calendar,
  Clock,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
// Navigation provided by AppLayout
import { useAuth } from "../contexts/AuthContext";
import { UserActionMenu } from "@/components/admin/UserActionMenu";
import { UserProfileModal } from "@/components/admin/UserProfileModal";
import { UserEditModal } from "@/components/admin/UserEditModal";
import { RateLimitMonitoring } from "@/components/admin/RateLimitMonitoring";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { FAQItemManager } from "@/components/admin/FAQItemManager";
import { UpdatesManager } from "@/components/admin/UpdatesManager";
import { ContactCategoryManager } from "@/components/admin/ContactCategoryManager";
import { ContactMethodManager } from "@/components/admin/ContactMethodManager";
import PlatformAvailabilityManager from "@/components/admin/PlatformAvailabilityManager";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { buildApiUrl } from "@/lib/api";
import type { ThemePreset } from "@/theme/presets";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "urgent";
type AdminSection =
  | "dashboard"
  | "support"
  | "vps-plans"
  | "container-plans"
  | "containers"
  | "servers"
  | "providers"
  | "stackscripts"
  | "networking"
  | "theme"
  | "user-management"
  | "rate-limiting"
  | "faq-management"
  | "platform"
  | "contact-management";

const ADMIN_SECTIONS: AdminSection[] = [
  "dashboard",
  "support",
  "vps-plans",
  "container-plans",
  "containers",
  "servers",
  "providers",
  "stackscripts",
  "networking",
  "theme",
  "user-management",
  "rate-limiting",
  "faq-management",
  "platform",
  "contact-management",
];

const DEFAULT_ADMIN_SECTION: AdminSection = "dashboard";

const TICKET_STATUS_META: Record<
  TicketStatus,
  { label: string; className: string }
> = {
  open: {
    label: "Open",
    className:
      "border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  in_progress: {
    label: "In Progress",
    className:
      "border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  resolved: {
    label: "Resolved",
    className:
      "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  closed: {
    label: "Closed",
    className:
      "border border-muted-foreground/15 bg-muted text-muted-foreground",
  },
};

const TICKET_PRIORITY_META: Record<
  TicketPriority,
  { label: string; className: string }
> = {
  low: {
    label: "Low",
    className:
      "border border-muted-foreground/15 bg-muted text-muted-foreground",
  },
  medium: {
    label: "Medium",
    className:
      "border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  high: {
    label: "High",
    className:
      "border border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  urgent: {
    label: "Urgent",
    className:
      "border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
  },
};

interface SupportTicket {
  id: string;
  organization_id: string;
  created_by: string;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  created_at: string;
  updated_at: string;
  messages: TicketMessage[];
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_type: "user" | "admin";
  sender_name: string;
  message: string;
  created_at: string;
}

interface VPSPlan {
  id: string;
  provider_id: string;
  name: string;
  provider_plan_id: string;
  base_price: number;
  markup_price: number;
  backup_price_monthly?: number;
  backup_price_hourly?: number;
  backup_upcharge_monthly?: number;
  backup_upcharge_hourly?: number;
  daily_backups_enabled?: boolean;
  weekly_backups_enabled?: boolean;
  specifications: any;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface Provider {
  id: string;
  name: string;
  type: "linode" | "digitalocean" | "aws" | "gcp";
  api_key_encrypted?: string;
  configuration?: any;
  active: boolean;
  created_at: string;
  updated_at: string;
  last_api_call?: string | null;
  validation_status?: "valid" | "invalid" | "pending" | "unknown";
  validation_message?: string | null;
}

interface ContainerPlan {
  id: string;
  name: string;
  cpu_cores: number;
  ram_gb: number;
  storage_gb: number;
  network_mbps: number;
  base_price: number;
  markup_price: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface PricingConfig {
  id?: string;
  price_per_cpu: number;
  price_per_ram_gb: number;
  price_per_storage_gb: number;
  price_per_network_mbps: number;
  currency?: string;
}

interface AdminContainerInstance {
  id: string;
  name: string;
  image: string;
  organization_id: string;
  config: Record<string, unknown> | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  organization_name?: string | null;
  organization_slug?: string | null;
  creator_email?: string | null;
  creator_name?: string | null;
}

interface AdminServerInstance {
  id: string;
  organization_id: string;
  plan_id: string;
  provider_instance_id: string;
  label: string;
  status: string;
  ip_address: string | null;
  configuration: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  organization_name?: string | null;
  organization_slug?: string | null;
  owner_id?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  plan_record_id?: string | null;
  plan_name?: string | null;
  plan_provider_plan_id?: string | null;
  plan_specifications?: Record<string, unknown> | null;
  provider_name?: string | null;
  region_label?: string | null;
}

interface AdminUserRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  updated_at: string;
  organizations: Array<{
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
    role: string;
  }>;
}

interface LinodeStackScriptSummary {
  id: number;
  label: string;
  description?: string;
  images?: string[];
  rev_note?: string;
  is_public?: boolean;
  mine?: boolean;
  user_defined_fields?: unknown[];
}

interface StackscriptConfigRecord {
  stackscript_id: number;
  label: string | null;
  description: string | null;
  is_enabled: boolean;
  display_order: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  script?: LinodeStackScriptSummary | null;
}

interface LinodeType {
  id: string;
  label: string;
  disk: number;
  memory: number;
  vcpus: number;
  transfer: number;
  price: {
    hourly: number;
    monthly: number;
  };
  backup_price_monthly?: number;
  backup_price_hourly?: number;
  type_class: string;
}

interface LinodeRegion {
  id: string;
  label: string;
  country: string;
  capabilities: string[];
  status: string;
}

const API_BASE_URL = "/api";

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return "—";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
};

const formatStatusLabel = (status: string | null | undefined) => {
  if (!status) {
    return "Unknown";
  }
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const statusBadgeClass = (status: string | null | undefined) => {
  if (!status) {
    return "border-muted-foreground/20 bg-muted text-muted-foreground";
  }
  const normalized = status.toLowerCase();
  if (
    normalized === "running" ||
    normalized === "active" ||
    normalized === "provisioned"
  ) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-500";
  }
  if (
    normalized === "provisioning" ||
    normalized === "pending" ||
    normalized === "in progress"
  ) {
    return "border-blue-500/20 bg-blue-500/10 text-blue-500";
  }
  if (normalized === "error" || normalized === "failed") {
    return "border-red-500/20 bg-red-500/10 text-red-500";
  }
  if (normalized === "stopped" || normalized === "offline") {
    return "border-slate-400/20 bg-slate-400/10 text-slate-400";
  }
  return "border-muted-foreground/20 bg-muted text-muted-foreground";
};

// Sortable Provider Row Component
interface SortableProviderRowProps {
  provider: any;
  validatingProviderId: string | null;
  onValidate: (id: string) => void;
  onEdit: (provider: any) => void;
  onDelete: (id: string) => void;
}

const SortableProviderRow: React.FC<SortableProviderRowProps> = ({
  provider,
  validatingProviderId,
  onValidate,
  onEdit,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: provider.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? "relative z-50" : ""}>
      <TableCell className="w-8">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      </TableCell>
      <TableCell className="font-medium text-foreground">
        {provider.name}
      </TableCell>
      <TableCell className="capitalize text-muted-foreground">
        {provider.type}
      </TableCell>
      <TableCell>
        <Badge variant={provider.active ? "default" : "secondary"}>
          {provider.active ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell>
        {provider.validation_status === "valid" && (
          <Badge
            variant="default"
            className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
          >
            <CheckCircle className="h-3 w-3" /> Valid
          </Badge>
        )}
        {provider.validation_status === "invalid" && (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" /> Invalid
          </Badge>
        )}
        {provider.validation_status === "pending" && (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" /> Pending
          </Badge>
        )}
        {(!provider.validation_status ||
          provider.validation_status === "unknown") && (
            <Badge variant="secondary" className="gap-1">
              <HelpCircle className="h-3 w-3" /> Unknown
            </Badge>
          )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {provider.last_api_call ? (
          <span
            title={new Date(provider.last_api_call).toLocaleString()}
          >
            {new Date(provider.last_api_call).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-muted-foreground/60">Never</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onValidate(provider.id)}
            disabled={validatingProviderId === provider.id}
            className="gap-1"
          >
            {validatingProviderId === provider.id ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Validating...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" /> Validate
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(provider)}
            className="gap-1"
          >
            <Edit className="h-4 w-4" /> Edit
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onDelete(provider.id)}
            className="gap-1"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

const Admin: React.FC = () => {
  const { token } = useAuth();
  const { themeId, setTheme, themes, reloadTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminSection>("dashboard");
  const [, setLoading] = useState(false);

  // Tickets state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null
  );
  const [replyMessage, setReplyMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TicketStatus>("all");
  const [deleteTicketId, setDeleteTicketId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Plans state
  const [plans, setPlans] = useState<VPSPlan[]>([]);
  const [editPlanId, setEditPlanId] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState<Partial<VPSPlan>>({});
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PricingConfig>({
    price_per_cpu: 0,
    price_per_ram_gb: 0,
    price_per_storage_gb: 0,
    price_per_network_mbps: 0,
    currency: "USD",
  });
  const [containerPlans, setContainerPlans] = useState<ContainerPlan[]>([]);
  const [newContainerPlan, setNewContainerPlan] = useState<
    Partial<ContainerPlan>
  >({
    name: "",
    cpu_cores: 1,
    ram_gb: 1,
    storage_gb: 10,
    network_mbps: 0,
    base_price: 0,
    markup_price: 0,
    active: true,
  });
  const [editContainerPlanId, setEditContainerPlanId] = useState<string | null>(
    null
  );
  const [editContainerPlan, setEditContainerPlan] = useState<
    Partial<ContainerPlan>
  >({});
  const [deleteContainerPlanId, setDeleteContainerPlanId] = useState<
    string | null
  >(null);
  const [containerInstances, setContainerInstances] = useState<
    AdminContainerInstance[]
  >([]);
  const [containerInstancesLoading, setContainerInstancesLoading] =
    useState(false);
  const [containerStatusFilter, setContainerStatusFilter] =
    useState<string>("all");
  const [containerSearch, setContainerSearch] = useState("");

  // Compute container plan price based on pricing configuration
  const computeContainerPlanPrice = (plan: ContainerPlan) => {
    const cpuPrice = (plan.cpu_cores || 0) * (pricing.price_per_cpu || 0);
    const ramPrice = (plan.ram_gb || 0) * (pricing.price_per_ram_gb || 0);
    const storagePrice =
      (plan.storage_gb || 0) * (pricing.price_per_storage_gb || 0);
    const networkPrice =
      (plan.network_mbps || 0) * (pricing.price_per_network_mbps || 0);
    return cpuPrice + ramPrice + storagePrice + networkPrice;
  };

  // Linode VPS state
  const [linodeTypes, setLinodeTypes] = useState<LinodeType[]>([]);
  const [linodeRegions, setLinodeRegions] = useState<LinodeRegion[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [showAddVPSPlan, setShowAddVPSPlan] = useState(false);
  const [newVPSPlan, setNewVPSPlan] = useState({
    name: "",
    selectedProviderId: "",
    selectedType: "",
    selectedRegion: "",
    markupPrice: 0,
    backupPriceMonthly: 0,
    backupPriceHourly: 0,
    backupUpchargeMonthly: 0,
    backupUpchargeHourly: 0,
    dailyBackupsEnabled: false,
    weeklyBackupsEnabled: true,
    active: true,
  });
  const [planTypeFilter, setPlanTypeFilter] = useState<string>("all");
  const [planProviderFilter, setPlanProviderFilter] = useState<string>("all");
  const [providerPlanPages, setProviderPlanPages] = useState<
    Record<string, number>
  >({});
  const plansPerPage = 5;
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [newProvider, setNewProvider] = useState({
    name: "",
    type: "",
    apiKey: "",
    active: true,
  });
  const [editProviderId, setEditProviderId] = useState<string | null>(null);
  const [editProvider, setEditProvider] = useState<Partial<Provider>>({});
  const [deleteProviderId, setDeleteProviderId] = useState<string | null>(null);
  const [validatingProviderId, setValidatingProviderId] = useState<
    string | null
  >(null);
  const [stackscriptConfigs, setStackscriptConfigs] = useState<
    StackscriptConfigRecord[]
  >([]);
  const [availableStackscripts, setAvailableStackscripts] = useState<
    LinodeStackScriptSummary[]
  >([]);
  const [stackscriptDrafts, setStackscriptDrafts] = useState<
    Record<
      number,
      {
        label: string;
        description: string;
        display_order: number;
        is_enabled: boolean;
      }
    >
  >({});
  const [stackscriptSearch, setStackscriptSearch] = useState("");
  const [savingStackscriptId, setSavingStackscriptId] = useState<number | null>(
    null
  );
  const [loadingStackscripts, setLoadingStackscripts] = useState(false);
  const [themeConfigLoading, setThemeConfigLoading] = useState(false);
  const [themeConfigLoaded, setThemeConfigLoaded] = useState(false);
  const [savingPresetId, setSavingPresetId] = useState<string | null>(null);
  const [themeUpdatedAt, setThemeUpdatedAt] = useState<string | null>(null);
  const [servers, setServers] = useState<AdminServerInstance[]>([]);
  const [serversLoading, setServersLoading] = useState(false);
  const [serverStatusFilter, setServerStatusFilter] = useState<string>("all");
  const [serverSearch, setServerSearch] = useState("");
  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [selectedUserForProfile, setSelectedUserForProfile] =
    useState<any>(null);
  const [userProfileModalOpen, setUserProfileModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] =
    useState<AdminUserRecord | null>(null);
  const [userEditModalOpen, setUserEditModalOpen] = useState(false);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const [savingUserUpdate, setSavingUserUpdate] = useState(false);

  // User action handlers
  const handleViewUser = useCallback(
    async (user: AdminUserRecord) => {
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      try {
        setLoadingUserDetails(true);
        const response = await fetch(
          buildApiUrl(`/api/admin/users/${user.id}`),
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to load user details");
        }

        const data = await response.json();
        setSelectedUserForProfile(data.user);
        setUserProfileModalOpen(true);
      } catch (error: any) {
        console.error("Failed to load user details:", error);
        toast.error(error.message || "Failed to load user details");
      } finally {
        setLoadingUserDetails(false);
      }
    },
    [token]
  );

  const handleCloseUserProfileModal = useCallback(() => {
    setUserProfileModalOpen(false);
    setSelectedUserForProfile(null);
  }, []);

  const handleEditUser = useCallback((user: AdminUserRecord) => {
    setSelectedUserForEdit(user);
    setUserEditModalOpen(true);
  }, []);

  const handleCloseUserEditModal = useCallback(() => {
    setUserEditModalOpen(false);
    setSelectedUserForEdit(null);
  }, []);

  const { startImpersonation } = useImpersonation();
  const [impersonationConfirmDialog, setImpersonationConfirmDialog] = useState<{
    isOpen: boolean;
    targetUser: AdminUserRecord | null;
  }>({ isOpen: false, targetUser: null });

  const handleImpersonateUser = useCallback(
    async (user: AdminUserRecord) => {
      try {
        await startImpersonation(user.id);
      } catch (error: any) {
        if (error.requiresConfirmation) {
          // Show confirmation dialog for admin-to-admin impersonation
          setImpersonationConfirmDialog({
            isOpen: true,
            targetUser: user,
          });
        } else {
          console.error("Impersonation error:", error);
          toast.error(error.message || "Failed to start impersonation");
        }
      }
    },
    [startImpersonation]
  );

  const handleConfirmAdminImpersonation = useCallback(async () => {
    if (!impersonationConfirmDialog.targetUser) return;

    try {
      await startImpersonation(impersonationConfirmDialog.targetUser.id, true);
      setImpersonationConfirmDialog({ isOpen: false, targetUser: null });
    } catch (error: any) {
      console.error("Admin impersonation error:", error);
      toast.error(error.message || "Failed to start admin impersonation");
    }
  }, [startImpersonation, impersonationConfirmDialog.targetUser]);

  const handleCancelAdminImpersonation = useCallback(() => {
    setImpersonationConfirmDialog({ isOpen: false, targetUser: null });
  }, []);

  // Networking rDNS state
  const [networkingTab, setNetworkingTab] = useState<"rdns" | "ipam">("rdns");
  const [rdnsBaseDomain, setRdnsBaseDomain] = useState<string>("");
  const [rdnsLoading, setRdnsLoading] = useState<boolean>(false);
  const [rdnsSaving, setRdnsSaving] = useState<boolean>(false);

  const authHeader = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  const updateAdminHash = useCallback(
    (section: AdminSection) => {
      if (section === "dashboard") {
        // Dashboard should have no hash
        if (location.hash) {
          navigate({ pathname: "/admin" }, { replace: true });
        }
      } else {
        const expectedHash = `#${section}`;
        if (location.hash !== expectedHash) {
          navigate(
            { pathname: "/admin", hash: expectedHash },
            { replace: true }
          );
        }
      }
    },
    [location.hash, navigate]
  );

  useEffect(() => {
    const hashValueRaw = location.hash ? location.hash.slice(1) : "";

    if (!hashValueRaw) {
      // No hash means we're on the dashboard
      if (activeTab !== DEFAULT_ADMIN_SECTION) {
        setActiveTab(DEFAULT_ADMIN_SECTION);
      }
      return;
    }

    const normalized = hashValueRaw.toLowerCase() as AdminSection;
    if (!ADMIN_SECTIONS.includes(normalized)) {
      return;
    }

    if (normalized !== activeTab) {
      setActiveTab(normalized);
    }
  }, [activeTab, location.hash]);

  const handleTabChange = useCallback(
    (value: string) => {
      const normalized = value.toLowerCase() as AdminSection;
      if (!ADMIN_SECTIONS.includes(normalized)) {
        return;
      }

      if (normalized !== activeTab) {
        setActiveTab(normalized);
      }

      updateAdminHash(normalized);
    },
    [activeTab, updateAdminHash]
  );

  // Allowed regions strictly from admin provider configuration
  const allowedRegionIds = useMemo(() => {
    const linodeProvider = providers.find(
      (p) => p.type === "linode" && p.active
    );
    const list =
      linodeProvider &&
        linodeProvider.configuration &&
        Array.isArray(linodeProvider.configuration.allowed_regions)
        ? (linodeProvider.configuration.allowed_regions as string[])
        : [];
    return list;
  }, [providers]);

  const allowedLinodeRegions = useMemo(() => {
    // If admin hasn't configured allowed regions, fall back to all regions from API
    // Check if selected provider is DigitalOcean or Linode to apply appropriate filtering
    const selectedProvider = providers.find(
      (p) => p.id === newVPSPlan.selectedProviderId
    );

    if (selectedProvider?.type === "digitalocean") {
      // For DigitalOcean, check its configuration for allowed regions
      const doAllowedRegions =
        selectedProvider.configuration &&
          Array.isArray(selectedProvider.configuration.allowed_regions)
          ? (selectedProvider.configuration.allowed_regions as string[])
          : [];

      if (doAllowedRegions.length === 0) return linodeRegions; // Show all if not configured
      const set = new Set(doAllowedRegions);
      return linodeRegions.filter((r) => set.has(r.id));
    } else {
      // For Linode or other providers, use original logic
      if (!allowedRegionIds || allowedRegionIds.length === 0)
        return linodeRegions;
      const set = new Set(allowedRegionIds);
      return linodeRegions.filter((r) => set.has(r.id));
    }
  }, [
    linodeRegions,
    allowedRegionIds,
    providers,
    newVPSPlan.selectedProviderId,
  ]);

  // Filter plan types by category
  const filteredPlanTypes = useMemo(() => {
    if (planTypeFilter === "all") return linodeTypes;

    // Mapping for backward compatibility if backend hasn't been restarted
    const FALLBACK_TYPE_CLASS_MAP: Record<string, string> = {
      nanode: "standard",
      standard: "standard",
      dedicated: "cpu",
      highmem: "memory",
      premium: "premium",
      gpu: "gpu",
      accelerated: "accelerated",
    };

    const filtered = linodeTypes.filter((type) => {
      let typeClass = (type.type_class || "").toLowerCase().trim();

      // Apply fallback mapping if backend returns unmapped values
      if (FALLBACK_TYPE_CLASS_MAP[typeClass]) {
        typeClass = FALLBACK_TYPE_CLASS_MAP[typeClass];
      }

      return typeClass === planTypeFilter.toLowerCase();
    });

    // Enhanced debug logging
    console.log("Filter Debug:", {
      planTypeFilter,
      totalPlans: linodeTypes.length,
      filteredCount: filtered.length,
      allTypeClasses: [...new Set(linodeTypes.map((t) => t.type_class))],
      samplePlans: linodeTypes.slice(0, 3).map((t) => ({
        id: t.id,
        label: t.label,
        type_class: t.type_class,
      })),
    });

    return filtered;
  }, [linodeTypes, planTypeFilter]);

  const filteredAvailableStackscripts = useMemo(() => {
    const searchTerm = stackscriptSearch.trim().toLowerCase();
    return availableStackscripts
      .filter((script) => {
        if (!searchTerm) return true;
        const haystack = `${script.label} ${script.description ?? ""
          }`.toLowerCase();
        return haystack.includes(searchTerm);
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [availableStackscripts, stackscriptSearch]);

  const filteredPlans = useMemo(() => {
    if (planProviderFilter === "all") return plans;
    return plans.filter((plan) => plan.provider_id === planProviderFilter);
  }, [plans, planProviderFilter]);

  const groupedPlans = useMemo(() => {
    const groups: Record<string, VPSPlan[]> = {};
    filteredPlans.forEach((plan) => {
      const providerId = plan.provider_id || "unknown";
      if (!groups[providerId]) {
        groups[providerId] = [];
      }
      groups[providerId].push(plan);
    });
    return groups;
  }, [filteredPlans]);

  const containerStatusOptions = useMemo(() => {
    const statuses = new Set<string>();
    containerInstances.forEach((instance) => {
      if (instance.status) {
        statuses.add(instance.status);
      }
    });
    return Array.from(statuses).sort();
  }, [containerInstances]);

  const filteredContainerInstances = useMemo(() => {
    const term = containerSearch.trim().toLowerCase();
    return containerInstances.filter((instance) => {
      const matchesStatus =
        containerStatusFilter === "all" ||
        (instance.status ?? "").toLowerCase() ===
        containerStatusFilter.toLowerCase();
      if (!matchesStatus) {
        return false;
      }

      if (!term) {
        return true;
      }

      const haystack = [
        instance.name,
        instance.image,
        instance.organization_name,
        instance.organization_slug,
        instance.creator_email,
        instance.creator_name,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase())
        .join(" ");

      return haystack.includes(term);
    });
  }, [containerInstances, containerSearch, containerStatusFilter]);

  const serverStatusOptions = useMemo(() => {
    const statuses = new Set<string>();
    servers.forEach((server) => {
      if (server.status) {
        statuses.add(server.status);
      }
    });
    return Array.from(statuses).sort();
  }, [servers]);

  const filteredServers = useMemo(() => {
    const term = serverSearch.trim().toLowerCase();
    return servers.filter((server) => {
      const matchesStatus =
        serverStatusFilter === "all" ||
        (server.status ?? "").toLowerCase() ===
        serverStatusFilter.toLowerCase();
      if (!matchesStatus) {
        return false;
      }

      if (!term) {
        return true;
      }

      const haystack = [
        server.label,
        server.ip_address,
        server.organization_name,
        server.organization_slug,
        server.owner_email,
        server.owner_name,
        server.plan_name,
        server.provider_name,
        server.region_label,
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase())
        .join(" ");

      return haystack.includes(term);
    });
  }, [serverSearch, serverStatusFilter, servers]);

  const userRoleOptions = useMemo(() => {
    const roles = new Set<string>();
    adminUsers.forEach((user) => {
      if (user.role) {
        roles.add(user.role);
      }
    });
    return Array.from(roles).sort();
  }, [adminUsers]);

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    return adminUsers.filter((user) => {
      const matchesRole =
        userRoleFilter === "all" ||
        user.role.toLowerCase() === userRoleFilter.toLowerCase();
      if (!matchesRole) {
        return false;
      }

      if (!term) {
        return true;
      }

      const orgText = Array.isArray(user.organizations)
        ? user.organizations
          .map(
            (org) =>
              `${org.organizationName} ${org.organizationSlug} ${org.role}`
          )
          .join(" ")
          .toLowerCase()
        : "";

      const haystack = `${user.name} ${user.email} ${orgText}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [adminUsers, userRoleFilter, userSearch]);

  const formattedThemeUpdatedAt = useMemo(() => {
    if (!themeUpdatedAt) {
      return "Not yet applied";
    }
    const parsed = new Date(themeUpdatedAt);
    if (Number.isNaN(parsed.getTime())) {
      return themeUpdatedAt;
    }
    return parsed.toLocaleString();
  }, [themeUpdatedAt]);

  const fetchThemeConfiguration = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      setThemeConfigLoading(true);
      const response = await fetch(buildApiUrl("/api/admin/theme"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to load theme configuration: ${response.status}`
        );
      }

      const payload = await response.json();
      const theme = payload?.theme as { updatedAt?: string } | undefined;

      setThemeUpdatedAt(
        typeof theme?.updatedAt === "string" ? theme.updatedAt : null
      );
      setThemeConfigLoaded(true);
    } catch (error) {
      console.error("Theme configuration fetch failed:", error);
      toast.error("Unable to load theme configuration");
    } finally {
      setThemeConfigLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === "theme" && token && !themeConfigLoaded) {
      fetchThemeConfiguration();
    }
  }, [activeTab, fetchThemeConfiguration, themeConfigLoaded, token]);

  const handlePresetSelection = useCallback(
    async (preset: ThemePreset) => {
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      try {
        setSavingPresetId(preset.id);
        setTheme(preset.id);

        const response = await fetch(buildApiUrl("/api/admin/theme"), {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ presetId: preset.id }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update theme: ${response.status}`);
        }

        const payload = await response.json();
        const theme = payload?.theme as { updatedAt?: string } | undefined;
        setThemeUpdatedAt(
          typeof theme?.updatedAt === "string" ? theme.updatedAt : null
        );

        await reloadTheme();
        setThemeConfigLoaded(false);
        await fetchThemeConfiguration();

        toast.success(`${preset.label} theme applied for all users.`);
      } catch (error) {
        console.error("Theme preset apply failed:", error);
        toast.error("Failed to apply theme preset");
        await reloadTheme();
      } finally {
        setSavingPresetId(null);
      }
    },
    [token, setTheme, reloadTheme, fetchThemeConfiguration]
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    switch (activeTab) {
      case "dashboard":
        // Fetch data for dashboard overview
        fetchTickets();
        fetchPlans();
        fetchContainerPlans();
        fetchServers();
        fetchAdminUsers();
        break;
      case "support":
        fetchTickets();
        break;
      case "vps-plans":
        fetchPlans();
        fetchProviders();
        fetchLinodeTypes();
        fetchLinodeRegions();
        break;
      case "stackscripts":
        fetchStackscriptConfigs();
        break;
      case "providers":
        fetchProviders();
        break;
      case "networking":
        fetchNetworkingRdns();
        break;
      case "theme":
        break;
      case "container-plans":
        fetchPricing();
        fetchContainerPlans();
        break;
      case "containers":
        fetchAdminContainers();
        break;
      case "servers":
        fetchServers();
        break;
      case "user-management":
        fetchAdminUsers();
        break;
      case "faq-management":
        // FAQ management will handle its own data fetching
        break;
      case "platform":
        // Platform settings page - no specific data fetching needed
        break;
      case "contact-management":
        // Contact management will handle its own data fetching
        break;
      default:
        fetchTickets();
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, token]);

  const fetchTickets = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/tickets`, {
        headers: authHeader,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load tickets");
      const mapped: SupportTicket[] = (data.tickets || []).map((t: any) => ({
        id: t.id,
        organization_id: t.organization_id,
        created_by: t.created_by,
        subject: t.subject,
        message: t.message,
        status: t.status,
        priority: t.priority,
        category: t.category,
        created_at: t.created_at,
        updated_at: t.updated_at,
        messages: [],
      }));
      setTickets(mapped);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const openTicket = async (ticket: SupportTicket) => {
    setSelectedTicket({ ...ticket, messages: [] });
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/tickets/${ticket.id}/replies`,
        { headers: authHeader }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load replies");
      const msgs: TicketMessage[] = (data.replies || []).map((m: any) => ({
        id: m.id,
        ticket_id: m.ticket_id,
        sender_type: m.sender_type,
        sender_name: m.sender_name,
        message: m.message,
        created_at: m.created_at,
      }));
      setSelectedTicket((prev) => (prev ? { ...prev, messages: msgs } : prev));
      setTimeout(scrollToBottom, 100);
    } catch (e: any) {
      toast.error(e.message || "Failed to load replies");
    }
  };

  const fetchProviders = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/providers`, {
        headers: authHeader,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load providers");
      setProviders(data.providers || []);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Networking: rDNS config
  const fetchNetworkingRdns = async () => {
    if (!token) return;
    setRdnsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/networking/rdns`, {
        headers: authHeader,
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to load rDNS configuration");
      const base = (data.config?.rdns_base_domain ??
        "ip.rev.skyvps360.xyz") as string;
      setRdnsBaseDomain(base);
      if (data.warning) {
        toast.message(data.warning);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRdnsLoading(false);
    }
  };

  const saveNetworkingRdns = async () => {
    if (!rdnsBaseDomain || !rdnsBaseDomain.trim()) {
      toast.error("Please enter a base domain");
      return;
    }
    setRdnsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/networking/rdns`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ rdns_base_domain: rdnsBaseDomain.trim() }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to save rDNS configuration");
      setRdnsBaseDomain(data.config?.rdns_base_domain ?? rdnsBaseDomain.trim());
      toast.success("rDNS configuration updated");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRdnsSaving(false);
    }
  };

  const fetchStackscriptConfigs = async () => {
    if (!token) return;
    setLoadingStackscripts(true);
    try {
      // Fetch configs
      const configRes = await fetch(
        `${API_BASE_URL}/admin/stackscripts/configs`,
        { headers: authHeader }
      );
      const configData = await configRes.json();
      if (!configRes.ok)
        throw new Error(
          configData.error || "Failed to load StackScript configs"
        );

      // Fetch available stackscripts
      const scriptRes = await fetch(
        `${API_BASE_URL}/admin/upstream/stackscripts?mine=true`,
        { headers: authHeader }
      );
      const scriptData = await scriptRes.json();
      if (!scriptRes.ok)
        throw new Error(scriptData.error || "Failed to load StackScripts");

      const configured: StackscriptConfigRecord[] = Array.isArray(
        configData.configs
      )
        ? configData.configs
        : [];
      const available: LinodeStackScriptSummary[] = Array.isArray(
        scriptData.stackscripts
      )
        ? scriptData.stackscripts
        : [];

      setStackscriptConfigs(configured);
      setAvailableStackscripts(available);

      const drafts: Record<
        number,
        {
          label: string;
          description: string;
          display_order: number;
          is_enabled: boolean;
        }
      > = {};
      configured.forEach((cfg) => {
        const script =
          available.find((item) => item.id === cfg.stackscript_id) || null;
        drafts[cfg.stackscript_id] = {
          label: cfg.label ?? script?.label ?? "",
          description:
            cfg.description ?? script?.description ?? script?.rev_note ?? "",
          display_order:
            typeof cfg.display_order === "number"
              ? cfg.display_order
              : Number(cfg.display_order) || 0,
          is_enabled: cfg.is_enabled !== false,
        };
      });
      setStackscriptDrafts(drafts);
    } catch (e: any) {
      toast.error(e.message || "Failed to load StackScripts");
    } finally {
      setLoadingStackscripts(false);
    }
  };

  const fetchStackscriptsAndConfigs = async () => {
    await fetchStackscriptConfigs();
  };

  const saveStackscriptConfig = async (
    stackscriptId: number,
    draft: {
      label: string;
      description: string;
      display_order: number;
      is_enabled: boolean;
    }
  ) => {
    try {
      setSavingStackscriptId(stackscriptId);
      const res = await fetch(`${API_BASE_URL}/admin/stackscripts/configs`, {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          stackscript_id: stackscriptId,
          label: draft.label,
          description: draft.description,
          is_enabled: draft.is_enabled,
          display_order: draft.display_order,
          metadata: {},
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to save StackScript config");
      toast.success("StackScript configuration saved");
      await fetchStackscriptConfigs();
    } catch (e: any) {
      toast.error(e.message || "Failed to save StackScript config");
    } finally {
      setSavingStackscriptId(null);
    }
  };
  const updateTicketStatus = async (ticketId: string, status: TicketStatus) => {
    if (!token) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/tickets/${ticketId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify({ status }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update ticket");
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? data.ticket : t))
      );
      if (selectedTicket && selectedTicket.id === ticketId)
        setSelectedTicket(data.ticket);
      toast.success("Ticket status updated");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const sendReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/tickets/${selectedTicket.id}/replies`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify({ message: replyMessage.trim() }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reply");
      const reply: TicketMessage = {
        id: data.reply.id,
        ticket_id: data.reply.ticket_id,
        sender_type: "admin",
        sender_name: "Staff Member",
        message: data.reply.message,
        created_at: data.reply.created_at,
      };
      setSelectedTicket((prev) =>
        prev ? { ...prev, messages: [...prev.messages, reply] } : prev
      );
      setReplyMessage("");
      toast.success("Reply sent");
      setTimeout(scrollToBottom, 100);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const fetchPlans = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/plans`, {
        headers: authHeader,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load plans");
      setPlans(data.plans);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Type class mapping configuration for provider-specific classifications
  // Maps DigitalOcean description values to standardized type classes
  const DIGITALOCEAN_TYPE_CLASS_MAP: Record<string, string> = {
    basic: "standard",
    "general purpose": "standard",
    "cpu-optimized": "cpu",
    "memory-optimized": "memory",
    "storage-optimized": "storage",
  };

  const fetchLinodeTypes = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/upstream/plans`, {
        headers: authHeader,
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to load upstream provider plans");

      // Backend now handles type_class mapping, so we can use the data directly
      setLinodeTypes(data.plans || []);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const fetchDigitalOceanSizes = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/digitalocean/sizes`, {
        headers: authHeader,
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to load DigitalOcean sizes");
      // Map DigitalOcean sizes to LinodeType format for consistent UI
      const mappedSizes: LinodeType[] = (data.sizes || []).map((size: any) => {
        // Extract description and normalize it
        const description = (size.description || "").toLowerCase().trim();

        // Map to type class using the mapping table
        const typeClass =
          DIGITALOCEAN_TYPE_CLASS_MAP[description] || "standard";

        // Log warning if unmapped
        if (!DIGITALOCEAN_TYPE_CLASS_MAP[description] && description) {
          console.warn(
            `Unmapped DigitalOcean description: "${size.description}"`
          );
        }

        return {
          id: size.slug,
          label: size.description || size.slug,
          disk: size.disk * 1024, // Convert GB to MB
          memory: size.memory,
          vcpus: size.vcpus,
          transfer: size.transfer * 1024, // Convert TB to GB
          price: {
            hourly: size.price_hourly,
            monthly: size.price_monthly,
          },
          backup_price_monthly: size.backup_price_monthly || 0,
          backup_price_hourly: size.backup_price_hourly || 0,
          type_class: typeClass,
        };
      });
      setLinodeTypes(mappedSizes);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const fetchLinodeRegions = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/upstream/regions`, {
        headers: authHeader,
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.error || "Failed to load upstream provider regions"
        );
      setLinodeRegions(data.regions);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const fetchDigitalOceanRegions = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/digitalocean/regions`, {
        headers: authHeader,
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to load DigitalOcean regions");
      // Map DigitalOcean regions to LinodeRegion format
      const mappedRegions: LinodeRegion[] = (data.regions || [])
        .filter((r: any) => r.available)
        .map((region: any) => ({
          id: region.slug,
          label: region.name,
          country: region.slug.split("-")[0] || "unknown",
          capabilities: region.features || [],
          status: region.available ? "ok" : "unavailable",
        }));
      setLinodeRegions(mappedRegions);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const fetchPricing = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/container/pricing`, {
        headers: authHeader,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load pricing");
      setPricing(
        data.pricing ?? {
          price_per_cpu: 0,
          price_per_ram_gb: 0,
          price_per_storage_gb: 0,
          price_per_network_mbps: 0,
          currency: "USD",
        }
      );
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const savePricing = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/container/pricing`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(pricing),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save pricing");
      setPricing(data.pricing);
      toast.success("Container pricing updated");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const fetchContainerPlans = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/container/plans`, {
        headers: authHeader,
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to load container plans");
      setContainerPlans(data.plans);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const fetchAdminContainers = async () => {
    if (!token) return;
    setContainerInstancesLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/containers`, {
        headers: authHeader,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load containers");
      const items: AdminContainerInstance[] = Array.isArray(data.containers)
        ? data.containers
        : [];
      setContainerInstances(items);
    } catch (e: any) {
      toast.error(e.message || "Failed to load containers");
    } finally {
      setContainerInstancesLoading(false);
    }
  };

  const fetchServers = async () => {
    if (!token) return;
    setServersLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/servers`, {
        headers: authHeader,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load servers");
      const rows: AdminServerInstance[] = Array.isArray(data.servers)
        ? data.servers.map((server: any) => ({
          ...server,
          configuration:
            server.configuration && typeof server.configuration === "object"
              ? server.configuration
              : null,
          plan_specifications:
            server.plan_specifications &&
              typeof server.plan_specifications === "object"
              ? server.plan_specifications
              : null,
        }))
        : [];
      setServers(rows);
    } catch (e: any) {
      toast.error(e.message || "Failed to load servers");
    } finally {
      setServersLoading(false);
    }
  };

  const fetchAdminUsers = useCallback(async () => {
    if (!token) return;
    setUsersLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: authHeader,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load users");
      const rows: AdminUserRecord[] = Array.isArray(data.users)
        ? data.users
        : [];
      setAdminUsers(rows);
    } catch (e: any) {
      toast.error(e.message || "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  }, [token, authHeader]);

  const handleSaveUserUpdate = useCallback(
    async (userId: string, updates: any) => {
      if (!token) {
        throw new Error("Authentication required");
      }

      try {
        setSavingUserUpdate(true);
        const response = await fetch(
          buildApiUrl(`/api/admin/users/${userId}`),
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updates),
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to update user");
        }

        const data = await response.json();

        // Update the user in the local state with optimistic update
        setAdminUsers((prev) =>
          prev.map((user) =>
            user.id === userId ? { ...user, ...data.user } : user
          )
        );

        // If this user is currently selected for profile view, update that too
        if (selectedUserForProfile && selectedUserForProfile.id === userId) {
          setSelectedUserForProfile({
            ...selectedUserForProfile,
            ...data.user,
          });
        }

        toast.success("User updated successfully");
      } catch (error: any) {
        console.error("Failed to update user:", error);
        // Re-fetch users to ensure consistency on error
        fetchAdminUsers();
        throw error;
      } finally {
        setSavingUserUpdate(false);
      }
    },
    [token, selectedUserForProfile, fetchAdminUsers]
  );

  const createContainerPlan = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/container/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(newContainerPlan),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create plan");
      setContainerPlans((prev) => [data.plan, ...prev]);
      setNewContainerPlan({
        name: "",
        cpu_cores: 1,
        ram_gb: 1,
        storage_gb: 10,
        network_mbps: 0,
        base_price: 0,
        markup_price: 0,
        active: true,
      });
      toast.success("Container plan created");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const savePlan = async () => {
    if (!editPlanId) return;
    
    // Find the plan being edited to get its provider
    const planBeingEdited = plans.find(p => p.id === editPlanId);
    const planProvider = planBeingEdited ? providers.find(p => p.id === planBeingEdited.provider_id) : null;
    
    // Validate backup frequency for DigitalOcean
    if (planProvider?.type === 'digitalocean') {
      const weeklyEnabled = editPlan.weekly_backups_enabled ?? planBeingEdited?.weekly_backups_enabled ?? true;
      const dailyEnabled = editPlan.daily_backups_enabled ?? planBeingEdited?.daily_backups_enabled ?? false;
      
      if (!weeklyEnabled && !dailyEnabled) {
        toast.error("Please select at least one backup frequency option");
        return;
      }
    }
    
    try {
      const res = await fetch(`${API_BASE_URL}/admin/plans/${editPlanId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          name: editPlan.name,
          base_price: editPlan.base_price,
          markup_price: editPlan.markup_price,
          backup_price_monthly: editPlan.backup_price_monthly || 0,
          backup_price_hourly: editPlan.backup_price_hourly || 0,
          backup_upcharge_monthly: editPlan.backup_upcharge_monthly || 0,
          backup_upcharge_hourly: editPlan.backup_upcharge_hourly || 0,
          daily_backups_enabled: editPlan.daily_backups_enabled,
          weekly_backups_enabled: editPlan.weekly_backups_enabled,
          active: editPlan.active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update plan");
      setPlans((prev) =>
        prev.map((p) => (p.id === editPlanId ? data.plan : p))
      );
      setEditPlanId(null);
      setEditPlan({});
      toast.success("Plan updated");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const createVPSPlan = async () => {
    if (!newVPSPlan.selectedProviderId) {
      toast.error("Please select a provider");
      return;
    }

    if (!newVPSPlan.selectedType || !newVPSPlan.selectedRegion) {
      toast.error("Please select both a plan type and region");
      return;
    }

    const selectedType = linodeTypes.find(
      (t) => t.id === newVPSPlan.selectedType
    );
    if (!selectedType) {
      toast.error("Selected plan type not found");
      return;
    }

    const selectedProvider = providers.find(
      (p) => p.id === newVPSPlan.selectedProviderId
    );
    if (!selectedProvider) {
      toast.error("Selected provider not found. Please refresh and try again.");
      return;
    }

    // Validate backup frequency for DigitalOcean
    if (selectedProvider.type === 'digitalocean') {
      if (!newVPSPlan.dailyBackupsEnabled && !newVPSPlan.weeklyBackupsEnabled) {
        toast.error("Please select at least one backup frequency option");
        return;
      }
    }

    try {
      const res = await fetch(`${API_BASE_URL}/admin/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          provider_id: selectedProvider.id,
          name:
            newVPSPlan.name && newVPSPlan.name.trim().length > 0
              ? newVPSPlan.name.trim()
              : `${selectedType.label} - ${newVPSPlan.selectedRegion}`,
          provider_plan_id: selectedType.id,
          base_price: selectedType.price.monthly,
          markup_price: newVPSPlan.markupPrice,
          backup_price_monthly: newVPSPlan.backupPriceMonthly || selectedType.backup_price_monthly || 0,
          backup_price_hourly: newVPSPlan.backupPriceHourly || selectedType.backup_price_hourly || 0,
          backup_upcharge_monthly: newVPSPlan.backupUpchargeMonthly || 0,
          backup_upcharge_hourly: newVPSPlan.backupUpchargeHourly || 0,
          daily_backups_enabled: selectedProvider.type === 'digitalocean' ? newVPSPlan.dailyBackupsEnabled : false,
          weekly_backups_enabled: selectedProvider.type === 'digitalocean' ? newVPSPlan.weeklyBackupsEnabled : true,
          specifications: {
            vcpus: selectedType.vcpus,
            memory: selectedType.memory,
            disk: selectedType.disk,
            transfer: selectedType.transfer,
            region: newVPSPlan.selectedRegion,
            type_class: selectedType.type_class,
          },
          active: newVPSPlan.active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create VPS plan");
      setPlans((prev) => [data.plan, ...prev]);
      setNewVPSPlan({
        name: "",
        selectedProviderId: "",
        selectedType: "",
        selectedRegion: "",
        markupPrice: 0,
        backupPriceMonthly: 0,
        backupPriceHourly: 0,
        backupUpchargeMonthly: 0,
        backupUpchargeHourly: 0,
        dailyBackupsEnabled: false,
        weeklyBackupsEnabled: true,
        active: true,
      });
      setShowAddVPSPlan(false);
      toast.success("VPS plan created successfully");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const createProvider = async () => {
    if (!newProvider.name || !newProvider.type || !newProvider.apiKey) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/admin/providers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          name: newProvider.name,
          type: newProvider.type,
          apiKey: newProvider.apiKey,
          active: newProvider.active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create provider");
      setProviders((prev) => [data.provider, ...prev]);
      setNewProvider({
        name: "",
        type: "",
        apiKey: "",
        active: true,
      });
      setShowAddProvider(false);
      toast.success("Provider added successfully");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Delete ticket
  const deleteTicket = async (ticketId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/tickets/${ticketId}`, {
        method: "DELETE",
        headers: authHeader,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete ticket");
      }
      setTickets(tickets.filter((t) => t.id !== ticketId));
      if (selectedTicket?.id === ticketId) setSelectedTicket(null);
      setDeleteTicketId(null);
      toast.success("Ticket deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Close ticket
  const closeTicket = async (ticketId: string) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/tickets/${ticketId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify({ status: "closed" }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to close ticket");
      setTickets(
        tickets.map((t) => (t.id === ticketId ? { ...t, status: "closed" } : t))
      );
      if (selectedTicket?.id === ticketId)
        setSelectedTicket({ ...selectedTicket, status: "closed" });
      toast.success("Ticket closed");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Delete VPS plan
  const deleteVPSPlan = async (planId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/plans/${planId}`, {
        method: "DELETE",
        headers: authHeader,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete plan");
      }
      setPlans(plans.filter((p) => p.id !== planId));
      setDeletePlanId(null);
      toast.success("VPS plan deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Update container plan
  const updateContainerPlan = async () => {
    if (!editContainerPlanId) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/container/plans/${editContainerPlanId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify(editContainerPlan),
        }
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to update container plan");
      setContainerPlans(
        containerPlans.map((p) =>
          p.id === editContainerPlanId ? data.plan : p
        )
      );
      setEditContainerPlanId(null);
      setEditContainerPlan({});
      toast.success("Container plan updated");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Delete container plan
  const deleteContainerPlan = async (planId: string) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/container/plans/${planId}`,
        {
          method: "DELETE",
          headers: authHeader,
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete container plan");
      }
      setContainerPlans(containerPlans.filter((p) => p.id !== planId));
      setDeleteContainerPlanId(null);
      toast.success("Container plan deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Update provider
  const updateProvider = async () => {
    if (!editProviderId) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/providers/${editProviderId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify(editProvider),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update provider");
      setProviders(
        providers.map((p) => (p.id === editProviderId ? data.provider : p))
      );
      setEditProviderId(null);
      setEditProvider({});
      toast.success("Provider updated");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Delete provider
  const deleteProvider = async (providerId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/providers/${providerId}`, {
        method: "DELETE",
        headers: authHeader,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete provider");
      }
      setProviders(providers.filter((p) => p.id !== providerId));
      setDeleteProviderId(null);
      toast.success("Provider deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Validate provider credentials
  const validateProvider = async (providerId: string) => {
    try {
      setValidatingProviderId(providerId);
      const res = await fetch(
        `${API_BASE_URL}/admin/providers/${providerId}/validate`,
        {
          method: "POST",
          headers: authHeader,
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to validate provider");

      // Update provider in state with validation results
      setProviders(
        providers.map((p) =>
          p.id === providerId
            ? {
              ...p,
              validation_status: data.validation_status,
              validation_message: data.validation_message,
              last_api_call: data.last_api_call,
            }
            : p
        )
      );

      if (data.validation_status === "valid") {
        toast.success("Provider credentials validated successfully");
      } else {
        toast.error(`Validation failed: ${data.validation_message}`);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setValidatingProviderId(null);
    }
  };

  // Reorder providers
  const reorderProviders = async (providerIds: string[]) => {
    try {
      console.log("Reordering providers:", providerIds);
      const res = await fetch(`${API_BASE_URL}/admin/providers/reorder`, {
        method: "PUT",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ providerIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Reorder error:", data);
        throw new Error(data.error || "Failed to reorder providers");
      }
      toast.success("Provider order updated successfully");
    } catch (e: any) {
      console.error("Reorder exception:", e);
      toast.error(e.message);
      // Revert the order on error
      fetchProviders();
    }
  };

  // Handle drag end for providers
  const handleProviderDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = providers.findIndex((p) => p.id === active.id);
      const newIndex = providers.findIndex((p) => p.id === over.id);

      const newProviders = arrayMove(providers, oldIndex, newIndex);
      setProviders(newProviders);

      // Save the new order to the backend
      reorderProviders(newProviders.map((p) => p.id));
    }
  };

  // Drag sensors for providers
  const providerSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredTickets = tickets.filter((t) =>
    statusFilter === "all" ? true : t.status === statusFilter
  );
  const openTicketCount = useMemo(
    () => tickets.filter((ticket) => ticket.status === "open").length,
    [tickets]
  );
  const overviewCards = useMemo(
    () => [
      {
        label: "Active tickets",
        value: tickets.length ? openTicketCount.toString() : "—",
        description: tickets.length
          ? `of ${tickets.length} conversations`
          : "Awaiting new requests",
        icon: Ticket,
      },
      {
        label: "VPS plans",
        value: plans.length ? plans.length.toString() : "—",
        description: "Published offerings",
        icon: DollarSign,
      },
      {
        label: "Container plans",
        value: containerPlans.length ? containerPlans.length.toString() : "—",
        description: "Managed templates",
        icon: Boxes,
      },
      {
        label: "Servers",
        value: servers.length ? servers.length.toString() : "—",
        description: "Instances under management",
        icon: ServerCog,
      },
      {
        label: "Users",
        value: adminUsers.length ? adminUsers.length.toString() : "—",
        description: "Active accounts",
        icon: Users,
      },
      {
        label: "Rate Limiting",
        value: "✓",
        description: "Monitoring active",
        icon: Shield,
      },
    ],
    [
      adminUsers.length,
      containerPlans.length,
      openTicketCount,
      plans.length,
      servers.length,
      tickets.length,
    ]
  );
  const handleRefresh = () => {
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    switch (activeTab) {
      case "support":
        fetchTickets();
        break;
      case "vps-plans":
        fetchPlans();
        fetchProviders();
        fetchLinodeTypes();
        fetchLinodeRegions();
        break;
      case "container-plans":
        fetchPricing();
        fetchContainerPlans();
        break;
      case "containers":
        fetchAdminContainers();
        break;
      case "servers":
        fetchServers();
        break;
      case "providers":
        fetchProviders();
        break;
      case "stackscripts":
        fetchStackscriptsAndConfigs();
        break;
      case "networking":
        fetchNetworkingRdns();
        break;
      case "theme":
        fetchThemeConfiguration();
        break;
      case "user-management":
        fetchAdminUsers();
        break;
      case "rate-limiting":
        // Rate limiting monitoring handles its own data fetching
        break;
      case "faq-management":
        // FAQ management will handle its own data fetching
        break;
      case "platform":
        // Platform settings page - no specific data fetching needed
        break;
      case "contact-management":
        // Contact management will handle its own data fetching
        break;
      default:
        break;
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 pb-16 pt-10 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Admin Control Center
          </h1>
          <p className="text-sm text-muted-foreground">
            Orchestrate support, infrastructure, networking, and account
            branding from a single workspace.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="h-9 gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => {
          const Icon = card.icon;

          return (
            <Card key={card.label} className="border-border/60">
              <CardContent className="flex items-center justify-between gap-4 p-5">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="text-2xl font-semibold text-foreground">
                    {card.value}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {card.description}
                  </p>
                </div>
                <span className="rounded-full bg-muted p-2 text-muted-foreground">
                  <Icon className="h-5 w-5" />
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <div className="space-y-6">
          <TabsContent value="dashboard" id="dashboard">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Welcome to the Admin Dashboard
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Monitor your platform's key metrics and navigate to specific
                  management areas using the sidebar.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => handleTabChange("support")}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="rounded-full bg-amber-500/10 p-2">
                      <Ticket className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Support Tickets</p>
                      <p className="text-xs text-muted-foreground">
                        Manage customer requests
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => handleTabChange("vps-plans")}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="rounded-full bg-green-500/10 p-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">VPS Plans</p>
                      <p className="text-xs text-muted-foreground">
                        Configure offerings
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => handleTabChange("servers")}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="rounded-full bg-blue-500/10 p-2">
                      <ServerCog className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Servers</p>
                      <p className="text-xs text-muted-foreground">
                        Monitor infrastructure
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => handleTabChange("user-management")}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="rounded-full bg-purple-500/10 p-2">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">User Management</p>
                      <p className="text-xs text-muted-foreground">
                        Manage accounts
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="theme" id="theme">
            <div className="bg-card shadow sm:rounded-lg">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border px-6 py-4">
                <div className="flex items-center gap-3">
                  <Palette className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h2 className="text-lg font-medium text-foreground">
                      Theme Manager
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Choose a theme preset. Updates roll out to every user
                      instantly.
                    </p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {themeConfigLoading
                    ? "Syncing..."
                    : `Last updated: ${formattedThemeUpdatedAt}`}
                </div>
              </div>
              <div className="space-y-10 px-6 py-6">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Presets
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose a built-in palette. Applying a preset changes the
                    experience for every organization member.
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {themes.map((preset) => {
                      const isActive = preset.id === themeId;
                      const isSaving = savingPresetId === preset.id;
                      const disabled =
                        (savingPresetId !== null &&
                          savingPresetId !== preset.id) ||
                        themeConfigLoading;

                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handlePresetSelection(preset)}
                          disabled={disabled}
                          className={`relative w-full rounded-lg border p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-opacity-40 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${isActive
                            ? "border-primary ring-2 ring-primary ring-opacity-20"
                            : "border-border hover:border-primary"
                            } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-base font-semibold text-foreground">
                                {preset.label}
                              </h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {preset.description}
                              </p>
                            </div>
                            <Badge variant={isActive ? "default" : "outline"}>
                              {isSaving
                                ? "Saving..."
                                : isActive
                                  ? "Active"
                                  : "Preview"}
                            </Badge>
                          </div>
                          <div className="mt-4 flex gap-4">
                            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                              <span>Primary</span>
                              <span
                                className="h-10 w-10 rounded-md border shadow-sm"
                                style={{
                                  backgroundColor: `hsl(${preset.light.primary})`,
                                }}
                              />
                            </div>
                            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                              <span>Surface</span>
                              <span
                                className="h-10 w-10 rounded-md border shadow-sm"
                                style={{
                                  backgroundColor: `hsl(${preset.light.background})`,
                                }}
                              />
                            </div>
                            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                              <span>Dark Primary</span>
                              <span
                                className="h-10 w-10 rounded-md border shadow-sm"
                                style={{
                                  backgroundColor: `hsl(${preset.dark.primary})`,
                                }}
                              />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="support" id="support">
            <div className="grid gap-6 lg:grid-cols-[340px_1fr] xl:grid-cols-[380px_1fr]">
              <Card className="flex min-h-[26rem] flex-col">
                <CardHeader className="space-y-4 border-b border-border pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg font-semibold text-foreground">
                        Support Tickets
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={fetchTickets}
                      className="h-8 w-8"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span className="sr-only">Refresh tickets</span>
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Status
                    </Label>
                    <Select
                      value={statusFilter}
                      onValueChange={(value) =>
                        setStatusFilter(value as typeof statusFilter)
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  {filteredTickets.length === 0 ? (
                    <div className="flex h-full items-center justify-center px-6 py-10 text-sm text-muted-foreground">
                      No tickets match the selected filter.
                    </div>
                  ) : (
                    <ScrollArea className="h-[32rem]">
                      <div className="divide-y divide-border">
                        {filteredTickets.map((t) => {
                          const isActive = selectedTicket?.id === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              className={cn(
                                "flex w-full flex-col gap-2 px-5 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                isActive ? "bg-muted/70" : "hover:bg-muted/50"
                              )}
                              onClick={() => openTicket(t)}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <p className="text-sm font-medium leading-5 text-foreground">
                                    {t.subject}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span className="capitalize">
                                      {t.category}
                                    </span>
                                    <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                                    <span>
                                      {new Date(t.created_at).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "capitalize",
                                    TICKET_STATUS_META[t.status].className
                                  )}
                                >
                                  {TICKET_STATUS_META[t.status].label}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {t.message}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
              <Card className="flex min-h-[26rem] flex-col">
                {!selectedTicket ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center text-muted-foreground">
                    <Ticket className="h-10 w-10 text-muted-foreground/60" />
                    <div className="space-y-1">
                      <p className="text-base font-medium text-foreground">
                        Select a ticket
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Choose a conversation to view details and respond.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <CardHeader className="space-y-4 border-b border-border pb-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <CardTitle className="text-xl font-semibold leading-tight text-foreground">
                              {selectedTicket.subject}
                            </CardTitle>
                            <Badge
                              variant="outline"
                              className={cn(
                                "capitalize",
                                TICKET_STATUS_META[selectedTicket.status]
                                  .className
                              )}
                            >
                              {TICKET_STATUS_META[selectedTicket.status].label}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <Badge
                              variant="outline"
                              className={cn(
                                "capitalize",
                                TICKET_PRIORITY_META[selectedTicket.priority]
                                  .className
                              )}
                            >
                              {
                                TICKET_PRIORITY_META[selectedTicket.priority]
                                  .label
                              }
                            </Badge>
                            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                            <span className="capitalize">
                              {selectedTicket.category}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                            <span>
                              Opened{" "}
                              {new Date(
                                selectedTicket.created_at
                              ).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {selectedTicket.status !== "open" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1"
                              onClick={() =>
                                updateTicketStatus(selectedTicket.id, "open")
                              }
                            >
                              <RefreshCw className="h-4 w-4" />
                              Re-open
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() =>
                              updateTicketStatus(
                                selectedTicket.id,
                                "in_progress"
                              )
                            }
                          >
                            <AlertCircle className="h-4 w-4" />
                            In Progress
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() =>
                              updateTicketStatus(selectedTicket.id, "resolved")
                            }
                          >
                            <CheckCircle className="h-4 w-4" />
                            Resolve
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="gap-1"
                            onClick={() => closeTicket(selectedTicket.id)}
                          >
                            <X className="h-4 w-4" />
                            Close
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1"
                            onClick={() => setDeleteTicketId(selectedTicket.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-6 p-0">
                      <div className="space-y-3 border-b border-border px-6 py-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Original message
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {selectedTicket.message}
                        </p>
                      </div>
                      <ScrollArea className="flex-1">
                        <div className="space-y-4 px-6 pb-6">
                          {selectedTicket.messages &&
                            selectedTicket.messages.length > 0 ? (
                            selectedTicket.messages.map((m) => (
                              <div
                                key={m.id}
                                className={cn(
                                  "flex",
                                  m.sender_type === "admin"
                                    ? "justify-end"
                                    : "justify-start"
                                )}
                              >
                                <div
                                  className={cn(
                                    "max-w-xl rounded-2xl border px-4 py-3 text-sm shadow-sm",
                                    m.sender_type === "admin"
                                      ? "border-primary/30 bg-primary text-primary-foreground"
                                      : "border-border bg-muted text-foreground"
                                  )}
                                >
                                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground">
                                      {m.sender_name}
                                    </span>
                                    <span>
                                      {new Date(m.created_at).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="whitespace-pre-wrap text-sm text-foreground">
                                    {m.message}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                              No replies yet
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </div>
                      </ScrollArea>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3 border-t border-border bg-muted/40 px-6 py-4">
                      <div className="w-full space-y-2">
                        <Label className="text-sm font-medium text-foreground">
                          Reply
                        </Label>
                        <Textarea
                          rows={3}
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          placeholder="Type your response to the client"
                        />
                      </div>
                      <div className="flex w-full flex-wrap justify-end gap-2">
                        <Button
                          onClick={sendReply}
                          disabled={!replyMessage.trim()}
                        >
                          Send Reply
                        </Button>
                        <Button
                          variant="outline"
                          disabled={!replyMessage}
                          onClick={() => setReplyMessage("")}
                        >
                          Clear
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setReplyMessage("");
                            setSelectedTicket(null);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardFooter>
                  </>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="vps-plans" id="vps-plans">
            <Card>
              <CardHeader className="flex flex-col gap-4 border-b border-b-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    VPS Plans
                  </CardTitle>
                  <CardDescription>
                    Curate what customers see when provisioning infrastructure.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowAddVPSPlan(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" /> Add VPS Plan
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Label
                    htmlFor="plan-provider-filter"
                    className="text-sm font-medium whitespace-nowrap"
                  >
                    Filter by Provider:
                  </Label>
                  <Select
                    value={planProviderFilter}
                    onValueChange={setPlanProviderFilter}
                  >
                    <SelectTrigger
                      id="plan-provider-filter"
                      className="w-[250px]"
                    >
                      <SelectValue placeholder="All providers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Providers</SelectItem>
                      {providers.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name} ({provider.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardContent className="px-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[12rem]">Name</TableHead>
                        <TableHead className="min-w-[10rem]">
                          Provider
                        </TableHead>
                        <TableHead className="min-w-[10rem]">
                          Provider Plan ID
                        </TableHead>
                        <TableHead className="min-w-[8rem]">
                          Base Price
                        </TableHead>
                        <TableHead className="min-w-[8rem]">Markup</TableHead>
                        <TableHead className="min-w-[10rem]">Backup Price</TableHead>
                        <TableHead className="min-w-[10rem]">Backup Frequencies</TableHead>
                        <TableHead className="w-32">Active</TableHead>
                        <TableHead className="w-36 text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPlans.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={9}
                            className="py-10 text-center text-muted-foreground"
                          >
                            {planProviderFilter === "all"
                              ? "No plans available"
                              : "No plans for selected provider"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        // Grouped view with pagination
                        Object.entries(groupedPlans).map(
                          ([providerId, providerPlans]) => {
                            const provider = providers.find(
                              (p) => p.id === providerId
                            );
                            const currentPage =
                              providerPlanPages[providerId] || 1;
                            const totalPages = Math.ceil(
                              providerPlans.length / plansPerPage
                            );
                            const startIndex = (currentPage - 1) * plansPerPage;
                            const endIndex = startIndex + plansPerPage;
                            const paginatedPlans = providerPlans.slice(
                              startIndex,
                              endIndex
                            );

                            return (
                              <React.Fragment key={providerId}>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                  <TableCell
                                    colSpan={9}
                                    className="py-3 font-semibold"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Server className="h-4 w-4 text-muted-foreground" />
                                        {provider
                                          ? `${provider.name} (${provider.type})`
                                          : "Unknown Provider"}
                                        <Badge
                                          variant="outline"
                                          className="ml-2"
                                        >
                                          {providerPlans.length}{" "}
                                          {providerPlans.length === 1
                                            ? "plan"
                                            : "plans"}
                                        </Badge>
                                      </div>
                                      {totalPages > 1 && (
                                        <div className="flex items-center gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                              setProviderPlanPages((prev) => ({
                                                ...prev,
                                                [providerId]: Math.max(
                                                  1,
                                                  currentPage - 1
                                                ),
                                              }))
                                            }
                                            disabled={currentPage === 1}
                                          >
                                            Previous
                                          </Button>
                                          <span className="text-xs text-muted-foreground">
                                            Page {currentPage} of {totalPages}
                                          </span>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                              setProviderPlanPages((prev) => ({
                                                ...prev,
                                                [providerId]: Math.min(
                                                  totalPages,
                                                  currentPage + 1
                                                ),
                                              }))
                                            }
                                            disabled={
                                              currentPage === totalPages
                                            }
                                          >
                                            Next
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                                {paginatedPlans.map((plan) => {
                                  const isEditing = editPlanId === plan.id;
                                  const planProvider = providers.find(
                                    (p) => p.id === plan.provider_id
                                  );

                                  return (
                                    <TableRow
                                      key={plan.id}
                                      className="align-top"
                                    >
                                      <TableCell>
                                        {isEditing ? (
                                          <Input
                                            value={
                                              (editPlan.name as
                                                | string
                                                | undefined) ?? plan.name
                                            }
                                            onChange={(e) =>
                                              setEditPlan((prev) => ({
                                                ...prev,
                                                name: e.target.value,
                                              }))
                                            }
                                            className="w-full"
                                          />
                                        ) : (
                                          <span className="text-sm text-foreground">
                                            {plan.name}
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex flex-col gap-1">
                                          <span className="text-sm text-foreground font-medium">
                                            {planProvider?.name || "Unknown"}
                                          </span>
                                          <span className="text-xs text-muted-foreground">
                                            {planProvider?.type || "unknown"}
                                          </span>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <span className="text-sm text-muted-foreground">
                                          {plan.provider_plan_id}
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        {isEditing ? (
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={
                                              (editPlan.base_price as
                                                | number
                                                | undefined) ?? plan.base_price
                                            }
                                            onChange={(e) =>
                                              setEditPlan((prev) => ({
                                                ...prev,
                                                base_price: parseFloat(
                                                  e.target.value
                                                ),
                                              }))
                                            }
                                            className="max-w-[8rem]"
                                          />
                                        ) : (
                                          <span className="text-sm text-muted-foreground">
                                            $
                                            {Number(plan.base_price).toFixed(2)}
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {isEditing ? (
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={
                                              (editPlan.markup_price as
                                                | number
                                                | undefined) ??
                                              plan.markup_price
                                            }
                                            onChange={(e) =>
                                              setEditPlan((prev) => ({
                                                ...prev,
                                                markup_price: parseFloat(
                                                  e.target.value
                                                ),
                                              }))
                                            }
                                            className="max-w-[8rem]"
                                          />
                                        ) : (
                                          <span className="text-sm text-muted-foreground">
                                            $
                                            {Number(plan.markup_price).toFixed(
                                              2
                                            )}
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {isEditing ? (
                                          <div className="space-y-2">
                                            <div className="text-xs text-muted-foreground mb-1">Base Price</div>
                                            <Input
                                              type="number"
                                              step="0.01"
                                              placeholder="Monthly"
                                              value={
                                                (editPlan.backup_price_monthly as
                                                  | number
                                                  | undefined) ??
                                                plan.backup_price_monthly ?? 0
                                              }
                                              onChange={(e) =>
                                                setEditPlan((prev) => ({
                                                  ...prev,
                                                  backup_price_monthly: parseFloat(
                                                    e.target.value
                                                  ) || 0,
                                                }))
                                              }
                                              className="max-w-[8rem]"
                                            />
                                            <Input
                                              type="number"
                                              step="0.000001"
                                              placeholder="Hourly"
                                              value={
                                                (editPlan.backup_price_hourly as
                                                  | number
                                                  | undefined) ??
                                                plan.backup_price_hourly ?? 0
                                              }
                                              onChange={(e) =>
                                                setEditPlan((prev) => ({
                                                  ...prev,
                                                  backup_price_hourly: parseFloat(
                                                    e.target.value
                                                  ) || 0,
                                                }))
                                              }
                                              className="max-w-[8rem]"
                                            />
                                            <div className="text-xs text-muted-foreground mt-2 mb-1">Upcharge</div>
                                            <Input
                                              type="number"
                                              step="0.01"
                                              placeholder="Monthly upcharge"
                                              value={
                                                (editPlan.backup_upcharge_monthly as
                                                  | number
                                                  | undefined) ??
                                                plan.backup_upcharge_monthly ?? 0
                                              }
                                              onChange={(e) => {
                                                const monthlyUpcharge = parseFloat(e.target.value) || 0;
                                                setEditPlan((prev) => ({
                                                  ...prev,
                                                  backup_upcharge_monthly: monthlyUpcharge,
                                                  backup_upcharge_hourly: monthlyUpcharge / 730,
                                                }));
                                              }}
                                              className="max-w-[8rem]"
                                            />
                                          </div>
                                        ) : (
                                          <div className="text-sm">
                                            {(Number(plan.backup_price_monthly) || 0) > 0 || (Number(plan.backup_upcharge_monthly) || 0) > 0 ? (
                                              <>
                                                <div className="text-muted-foreground">
                                                  ${((Number(plan.backup_price_monthly) || 0) + (Number(plan.backup_upcharge_monthly) || 0)).toFixed(2)}/mo
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                  Base: ${(Number(plan.backup_price_monthly) || 0).toFixed(2)} + Upcharge: ${(Number(plan.backup_upcharge_monthly) || 0).toFixed(2)}
                                                </div>
                                              </>
                                            ) : (
                                              <span className="text-xs text-muted-foreground">
                                                Not configured
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {isEditing && planProvider?.type === 'digitalocean' ? (
                                          <div className="space-y-2">
                                            <div className="flex items-center space-x-2">
                                              <Checkbox
                                                id={`edit-weekly-${plan.id}`}
                                                checked={
                                                  (editPlan.weekly_backups_enabled as boolean | undefined) ??
                                                  plan.weekly_backups_enabled ??
                                                  true
                                                }
                                                onCheckedChange={(checked) =>
                                                  setEditPlan((prev) => ({
                                                    ...prev,
                                                    weekly_backups_enabled: !!checked,
                                                  }))
                                                }
                                              />
                                              <Label htmlFor={`edit-weekly-${plan.id}`} className="text-xs font-normal cursor-pointer">
                                                Weekly
                                              </Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                              <Checkbox
                                                id={`edit-daily-${plan.id}`}
                                                checked={
                                                  (editPlan.daily_backups_enabled as boolean | undefined) ??
                                                  plan.daily_backups_enabled ??
                                                  false
                                                }
                                                onCheckedChange={(checked) =>
                                                  setEditPlan((prev) => ({
                                                    ...prev,
                                                    daily_backups_enabled: !!checked,
                                                  }))
                                                }
                                              />
                                              <Label htmlFor={`edit-daily-${plan.id}`} className="text-xs font-normal cursor-pointer">
                                                Daily
                                              </Label>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="text-sm">
                                            {planProvider?.type === 'digitalocean' ? (
                                              <div className="flex flex-col gap-1">
                                                {plan.weekly_backups_enabled && (
                                                  <Badge variant="outline" className="w-fit text-xs">
                                                    Weekly
                                                  </Badge>
                                                )}
                                                {plan.daily_backups_enabled && (
                                                  <Badge variant="outline" className="w-fit text-xs">
                                                    Daily
                                                  </Badge>
                                                )}
                                                {!plan.weekly_backups_enabled && !plan.daily_backups_enabled && (
                                                  <span className="text-xs text-muted-foreground">None</span>
                                                )}
                                              </div>
                                            ) : (
                                              <span className="text-xs text-muted-foreground">
                                                Weekly (default)
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {isEditing ? (
                                          <div className="flex items-center gap-2">
                                            <Switch
                                              checked={
                                                (editPlan.active as
                                                  | boolean
                                                  | undefined) ?? plan.active
                                              }
                                              onCheckedChange={(checked) =>
                                                setEditPlan((prev) => ({
                                                  ...prev,
                                                  active: checked,
                                                }))
                                              }
                                            />
                                            <span className="text-xs text-muted-foreground">
                                              {(editPlan.active as
                                                | boolean
                                                | undefined) ?? plan.active
                                                ? "Active"
                                                : "Inactive"}
                                            </span>
                                          </div>
                                        ) : (
                                          <Badge
                                            variant={
                                              plan.active
                                                ? "default"
                                                : "secondary"
                                            }
                                          >
                                            {plan.active
                                              ? "Active"
                                              : "Inactive"}
                                          </Badge>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {isEditing ? (
                                          <div className="flex justify-end gap-2">
                                            <Button
                                              size="sm"
                                              onClick={savePlan}
                                            >
                                              Save
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => {
                                                setEditPlanId(null);
                                                setEditPlan({});
                                              }}
                                            >
                                              Cancel
                                            </Button>
                                          </div>
                                        ) : (
                                          <div className="flex justify-end gap-2">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => {
                                                setEditPlanId(plan.id);
                                                setEditPlan({
                                                  name: plan.name,
                                                  base_price: plan.base_price,
                                                  markup_price:
                                                    plan.markup_price,
                                                  backup_price_monthly:
                                                    plan.backup_price_monthly || 0,
                                                  backup_price_hourly:
                                                    plan.backup_price_hourly || 0,
                                                  backup_upcharge_monthly:
                                                    plan.backup_upcharge_monthly || 0,
                                                  backup_upcharge_hourly:
                                                    plan.backup_upcharge_hourly || 0,
                                                  daily_backups_enabled:
                                                    plan.daily_backups_enabled ?? false,
                                                  weekly_backups_enabled:
                                                    plan.weekly_backups_enabled ?? true,
                                                  active: plan.active,
                                                });
                                              }}
                                              className="gap-1"
                                            >
                                              <Edit className="h-4 w-4" /> Edit
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="destructive"
                                              onClick={() =>
                                                setDeletePlanId(plan.id)
                                              }
                                              className="gap-1"
                                            >
                                              <Trash2 className="h-4 w-4" />{" "}
                                              Delete
                                            </Button>
                                          </div>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </React.Fragment>
                            );
                          }
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Dialog
              open={showAddVPSPlan}
              onOpenChange={(open) => {
                setShowAddVPSPlan(open);
                if (!open) {
                  setNewVPSPlan({
                    name: "",
                    selectedProviderId: "",
                    selectedType: "",
                    selectedRegion: "",
                    markupPrice: 0,
                    backupPriceMonthly: 0,
                    backupPriceHourly: 0,
                    backupUpchargeMonthly: 0,
                    backupUpchargeHourly: 0,
                    dailyBackupsEnabled: false,
                    weeklyBackupsEnabled: true,
                    active: true,
                  });
                }
              }}
            >
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Create VPS Plan</DialogTitle>
                  <DialogDescription>
                    Pair your markup with a plan type and region. Customers will
                    see it instantly once active.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="plan-name">Display name</Label>
                    <Input
                      id="plan-name"
                      placeholder="e.g. Premium 4GB - Newark"
                      value={newVPSPlan.name}
                      onChange={(e) =>
                        setNewVPSPlan((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Provider</Label>
                    <Select
                      value={newVPSPlan.selectedProviderId}
                      onValueChange={(value) => {
                        setNewVPSPlan((prev) => ({
                          ...prev,
                          selectedProviderId: value,
                          selectedType: "",
                          selectedRegion: "",
                        }));
                        setPlanTypeFilter("all"); // Reset filter when changing provider
                        // Fetch plans for this provider
                        const provider = providers.find((p) => p.id === value);
                        if (provider) {
                          if (provider.type === "digitalocean") {
                            fetchDigitalOceanSizes();
                            fetchDigitalOceanRegions();
                          } else if (provider.type === "linode") {
                            fetchLinodeTypes();
                            fetchLinodeRegions();
                          }
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a provider" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] overflow-y-auto">
                        {providers
                          .filter((p) => p.active)
                          .map((provider) => (
                            <SelectItem key={provider.id} value={provider.id}>
                              {provider.name} ({provider.type})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Filter by Category</Label>
                    <Select
                      value={planTypeFilter}
                      onValueChange={(value) => setPlanTypeFilter(value)}
                      disabled={!newVPSPlan.selectedProviderId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All plan types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {(() => {
                          const selectedProvider = providers.find(
                            (p) => p.id === newVPSPlan.selectedProviderId
                          );

                          if (selectedProvider?.type === "linode") {
                            // Linode-specific filters based on their type_class values
                            return (
                              <>
                                <SelectItem value="standard">
                                  Shared CPU (Standard/Nanode)
                                </SelectItem>
                                <SelectItem value="cpu">
                                  Dedicated CPU
                                </SelectItem>
                                <SelectItem value="memory">
                                  High Memory
                                </SelectItem>
                                <SelectItem value="premium">
                                  Premium CPU
                                </SelectItem>
                                <SelectItem value="gpu">GPU</SelectItem>
                              </>
                            );
                          } else if (
                            selectedProvider?.type === "digitalocean"
                          ) {
                            // DigitalOcean-specific filters
                            return (
                              <>
                                <SelectItem value="standard">
                                  Basic / Standard
                                </SelectItem>
                                <SelectItem value="cpu">
                                  CPU-Optimized
                                </SelectItem>
                                <SelectItem value="memory">
                                  Memory-Optimized
                                </SelectItem>
                                <SelectItem value="storage">
                                  Storage-Optimized
                                </SelectItem>
                                <SelectItem value="premium">
                                  Premium (Intel/AMD)
                                </SelectItem>
                              </>
                            );
                          } else {
                            // Generic fallback
                            return (
                              <>
                                <SelectItem value="standard">
                                  Standard / Basic
                                </SelectItem>
                                <SelectItem value="cpu">
                                  CPU-Optimized
                                </SelectItem>
                                <SelectItem value="memory">
                                  Memory-Optimized
                                </SelectItem>
                                <SelectItem value="storage">
                                  Storage-Optimized
                                </SelectItem>
                                <SelectItem value="premium">Premium</SelectItem>
                              </>
                            );
                          }
                        })()}
                      </SelectContent>
                    </Select>
                    {filteredPlanTypes.length === 0 &&
                      planTypeFilter !== "all" ? (
                      <p className="text-xs text-muted-foreground">
                        No plans in this category. Try "All Types".
                      </p>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    <Label>Plan type</Label>
                    <Select
                      value={newVPSPlan.selectedType}
                      onValueChange={(value) => {
                        // Find the selected type to get backup pricing
                        const selectedType = linodeTypes.find(t => t.id === value);
                        setNewVPSPlan((prev) => ({
                          ...prev,
                          selectedType: value,
                          // Auto-populate backup pricing from provider defaults
                          backupPriceMonthly: selectedType?.backup_price_monthly || 0,
                          backupPriceHourly: selectedType?.backup_price_hourly || 0,
                        }));
                      }}
                      disabled={!newVPSPlan.selectedProviderId}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            newVPSPlan.selectedProviderId
                              ? "Select a plan type"
                              : "Select provider first"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={5}>
                        {filteredPlanTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.label} · {type.vcpus} vCPU · {type.memory}MB
                            RAM · {Math.round(type.disk / 1024)}GB Disk · $
                            {type.price.monthly}/mo
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Region</Label>
                    <Select
                      value={newVPSPlan.selectedRegion}
                      onValueChange={(value) =>
                        setNewVPSPlan((prev) => ({
                          ...prev,
                          selectedRegion: value,
                        }))
                      }
                    >
                      <SelectTrigger
                        disabled={allowedLinodeRegions.length === 0}
                      >
                        <SelectValue placeholder="Select a region" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={5}>
                        {allowedLinodeRegions.map((region) => (
                          <SelectItem key={region.id} value={region.id}>
                            {region.label} ({region.country})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {allowedLinodeRegions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No regions available. Check your provider configuration.
                      </p>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="plan-markup">Markup (USD)</Label>
                    <Input
                      id="plan-markup"
                      type="number"
                      step="0.01"
                      min={0}
                      value={
                        Number.isFinite(newVPSPlan.markupPrice)
                          ? newVPSPlan.markupPrice
                          : 0
                      }
                      onChange={(e) =>
                        setNewVPSPlan((prev) => ({
                          ...prev,
                          markupPrice: Number(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Base Backup Price (from provider)</Label>
                    <Input
                      id="backup-price-monthly"
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder={(() => {
                        const selectedType = linodeTypes.find(t => t.id === newVPSPlan.selectedType);
                        return selectedType?.backup_price_monthly
                          ? `Default: $${(Number(selectedType.backup_price_monthly) || 0).toFixed(2)}`
                          : "0.00";
                      })()}
                      value={newVPSPlan.backupPriceMonthly || ""}
                      onChange={(e) =>
                        setNewVPSPlan((prev) => ({
                          ...prev,
                          backupPriceMonthly: Number(e.target.value) || 0,
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      {(() => {
                        const selectedType = linodeTypes.find(t => t.id === newVPSPlan.selectedType);
                        const selectedProvider = providers.find(p => p.id === newVPSPlan.selectedProviderId);
                        
                        if (selectedType?.backup_price_monthly && Number(selectedType.backup_price_monthly) > 0) {
                          if (selectedProvider?.type === 'digitalocean') {
                            return `Auto-filled: $${(Number(selectedType.backup_price_monthly) || 0).toFixed(2)}/mo (Weekly backups - 20%). For daily backups (30%), multiply by 1.5`;
                          }
                          return `Auto-filled from provider: $${(Number(selectedType.backup_price_monthly) || 0).toFixed(2)}/mo (Weekly backups)`;
                        }
                        return "Monthly cost for backup service (auto-filled from provider)";
                      })()}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="backup-price-hourly">Backup Price - Hourly (USD)</Label>
                    <Input
                      id="backup-price-hourly"
                      type="number"
                      step="0.000001"
                      min={0}
                      placeholder={(() => {
                        const selectedType = linodeTypes.find(t => t.id === newVPSPlan.selectedType);
                        return selectedType?.backup_price_hourly
                          ? `Default: $${(Number(selectedType.backup_price_hourly) || 0).toFixed(6)}`
                          : "0.000000";
                      })()}
                      value={newVPSPlan.backupPriceHourly || ""}
                      onChange={(e) =>
                        setNewVPSPlan((prev) => ({
                          ...prev,
                          backupPriceHourly: Number(e.target.value) || 0,
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      {(() => {
                        const selectedType = linodeTypes.find(t => t.id === newVPSPlan.selectedType);
                        if (selectedType?.backup_price_hourly && Number(selectedType.backup_price_hourly) > 0) {
                          return `Auto-filled from provider: $${(Number(selectedType.backup_price_hourly) || 0).toFixed(6)}/hr`;
                        }
                        return "Hourly cost for backup service (auto-filled from provider)";
                      })()}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="backup-upcharge-monthly">Backup Upcharge - Monthly (USD)</Label>
                    <Input
                      id="backup-upcharge-monthly"
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="0.00"
                      value={newVPSPlan.backupUpchargeMonthly || ""}
                      onChange={(e) => {
                        const monthlyUpcharge = Number(e.target.value) || 0;
                        setNewVPSPlan((prev) => ({
                          ...prev,
                          backupUpchargeMonthly: monthlyUpcharge,
                          backupUpchargeHourly: monthlyUpcharge / 730,
                        }));
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Additional markup you charge for backups (hourly: ${((Number(newVPSPlan.backupUpchargeMonthly) || 0) / 730).toFixed(6)}/hr)
                    </p>
                  </div>
                  {(() => {
                    const selectedProvider = providers.find(p => p.id === newVPSPlan.selectedProviderId);
                    const selectedType = linodeTypes.find(t => t.id === newVPSPlan.selectedType);
                    const baseBackupPrice = newVPSPlan.backupPriceMonthly || 0;
                    const upcharge = newVPSPlan.backupUpchargeMonthly || 0;
                    const totalWeekly = baseBackupPrice + upcharge;
                    const totalDaily = totalWeekly * 1.5;

                    if (selectedProvider?.type === 'digitalocean' && selectedType) {
                      return (
                        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                          <Label className="text-sm font-medium">Available Backup Frequencies</Label>
                          <div className="space-y-2">
                            <div className="flex items-start space-x-2">
                              <Checkbox
                                id="weekly-backups"
                                checked={newVPSPlan.weeklyBackupsEnabled}
                                onCheckedChange={(checked) =>
                                  setNewVPSPlan((prev) => ({
                                    ...prev,
                                    weeklyBackupsEnabled: !!checked,
                                  }))
                                }
                              />
                              <div className="grid gap-1">
                                <Label htmlFor="weekly-backups" className="font-normal cursor-pointer">
                                  Weekly backups
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  Base price: ${totalWeekly.toFixed(2)}/mo
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start space-x-2">
                              <Checkbox
                                id="daily-backups"
                                checked={newVPSPlan.dailyBackupsEnabled}
                                onCheckedChange={(checked) =>
                                  setNewVPSPlan((prev) => ({
                                    ...prev,
                                    dailyBackupsEnabled: !!checked,
                                  }))
                                }
                              />
                              <div className="grid gap-1">
                                <Label htmlFor="daily-backups" className="font-normal cursor-pointer">
                                  Daily backups (+50% of weekly price)
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                  Total price: ${totalDaily.toFixed(2)}/mo
                                </p>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Select which backup frequencies users can choose from. At least one must be selected.
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Enabled for customers
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Toggle off to hide this plan without deleting it.
                      </p>
                    </div>
                    <Switch
                      checked={newVPSPlan.active}
                      onCheckedChange={(checked) =>
                        setNewVPSPlan((prev) => ({ ...prev, active: checked }))
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddVPSPlan(false);
                      setNewVPSPlan({
                        name: "",
                        selectedProviderId: "",
                        selectedType: "",
                        selectedRegion: "",
                        markupPrice: 0,
                        backupPriceMonthly: 0,
                        backupPriceHourly: 0,
                        backupUpchargeMonthly: 0,
                        backupUpchargeHourly: 0,
                        dailyBackupsEnabled: false,
                        weeklyBackupsEnabled: true,
                        active: true,
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={createVPSPlan}
                    disabled={
                      !newVPSPlan.selectedType || !newVPSPlan.selectedRegion
                    }
                  >
                    Create Plan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="user-management" id="user-management">
            <Card>
              <CardHeader className="flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    User Management
                  </CardTitle>
                  <CardDescription>
                    Review accounts and their organization memberships.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={fetchAdminUsers}
                  disabled={usersLoading}
                >
                  <RefreshCw className="h-4 w-4" />
                  {usersLoading ? "Refreshing…" : "Refresh"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 animate-in slide-in-from-top-2 duration-300">
                  <div className="md:col-span-1">
                    <Label
                      htmlFor="user-search"
                      className="text-sm font-medium"
                    >
                      Search Users
                    </Label>
                    <div className="relative mt-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200" />
                      <Input
                        id="user-search"
                        placeholder="Search by name, email, or organization"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className={cn(
                          "pl-9 transition-all duration-200 focus:scale-[1.02]",
                          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        )}
                        aria-describedby="user-search-help"
                        autoComplete="off"
                      />
                      <div id="user-search-help" className="sr-only">
                        Search users by name, email address, or organization
                        name
                      </div>
                    </div>
                    {userSearch && (
                      <p className="mt-1 text-xs text-muted-foreground animate-in fade-in-0 duration-200">
                        {filteredUsers.length} user
                        {filteredUsers.length !== 1 ? "s" : ""} found
                      </p>
                    )}
                  </div>
                  <div className="md:col-span-1 xl:col-span-1">
                    <Label htmlFor="user-role" className="text-sm font-medium">
                      Filter by Role
                    </Label>
                    <Select
                      value={userRoleFilter}
                      onValueChange={(value) => setUserRoleFilter(value)}
                    >
                      <SelectTrigger
                        id="user-role"
                        className={cn(
                          "mt-1 transition-all duration-200 focus:scale-[1.02]",
                          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        )}
                        aria-describedby="user-role-help"
                      >
                        <SelectValue placeholder="All roles" />
                      </SelectTrigger>
                      <SelectContent className="animate-in fade-in-0 zoom-in-95 duration-200">
                        <SelectItem
                          value="all"
                          className="transition-colors duration-150 hover:bg-accent"
                        >
                          All Roles
                        </SelectItem>
                        {userRoleOptions.map((role) => (
                          <SelectItem
                            key={role}
                            value={role.toLowerCase()}
                            className="transition-colors duration-150 hover:bg-accent"
                          >
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div id="user-role-help" className="sr-only">
                      Filter users by their assigned role
                    </div>
                    {userRoleFilter !== "all" && (
                      <p className="mt-1 text-xs text-muted-foreground animate-in fade-in-0 duration-200">
                        Showing {userRoleFilter} users only
                      </p>
                    )}
                  </div>
                </div>
                <div
                  className="overflow-x-auto"
                  role="region"
                  aria-label="User management table"
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[16rem]" scope="col">
                          <span className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            User
                          </span>
                        </TableHead>
                        <TableHead className="w-32" scope="col">
                          <span className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Role
                          </span>
                        </TableHead>
                        <TableHead className="min-w-[18rem]" scope="col">
                          Organizations
                        </TableHead>
                        <TableHead className="min-w-[12rem]" scope="col">
                          <span className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Created
                          </span>
                        </TableHead>
                        <TableHead className="min-w-[12rem]" scope="col">
                          <span className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Updated
                          </span>
                        </TableHead>
                        <TableHead className="w-16" scope="col">
                          <span className="sr-only">Actions</span>
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersLoading ? (
                        <>
                          {Array.from({ length: 5 }).map((_, index) => (
                            <TableRow
                              key={`skeleton-${index}`}
                              className="animate-in fade-in-0 duration-300"
                              style={{ animationDelay: `${index * 100}ms` }}
                            >
                              <TableCell>
                                <div className="space-y-2">
                                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                                  <div className="h-3 w-48 bg-muted animate-pulse rounded" />
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="h-5 w-16 bg-muted animate-pulse rounded-full" />
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <div className="h-5 w-20 bg-muted animate-pulse rounded-full" />
                                  <div className="h-5 w-16 bg-muted animate-pulse rounded-full" />
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                              </TableCell>
                              <TableCell>
                                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                              </TableCell>
                              <TableCell>
                                <div className="h-8 w-8 bg-muted animate-pulse rounded" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      ) : filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="py-10 text-center text-muted-foreground animate-in fade-in-0 duration-500"
                          >
                            <div className="flex flex-col items-center gap-2">
                              <Users className="h-8 w-8 opacity-50" />
                              <p>No users match the current filters.</p>
                              <p className="text-xs opacity-75">
                                Try adjusting your search or filter criteria.
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((user, index) => (
                          <TableRow
                            key={user.id}
                            className={cn(
                              "align-top transition-all duration-200 hover:bg-accent/30",
                              "animate-in slide-in-from-bottom-2 duration-300"
                            )}
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium text-foreground transition-colors duration-200">
                                  {user.name}
                                </p>
                                <p className="text-sm text-muted-foreground transition-colors duration-200">
                                  {user.email}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "border-slate-400/30 bg-slate-400/10 text-slate-300 transition-all duration-200",
                                  user.role === "admin" &&
                                  "border-red-400/30 bg-red-400/10 text-red-400"
                                )}
                              >
                                {user.role.charAt(0).toUpperCase() +
                                  user.role.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {Array.isArray(user.organizations) &&
                                user.organizations.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {user.organizations.map((org, orgIndex) => (
                                    <Badge
                                      key={`${user.id}-${org.organizationId}`}
                                      variant="secondary"
                                      className={cn(
                                        "gap-1 transition-all duration-200 hover:scale-105",
                                        "animate-in zoom-in-95 duration-200"
                                      )}
                                      style={{
                                        animationDelay: `${index * 50 + orgIndex * 100
                                          }ms`,
                                      }}
                                    >
                                      <span>
                                        {org.organizationName ||
                                          org.organizationSlug ||
                                          org.organizationId}
                                      </span>
                                      <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                                        {org.role}
                                      </span>
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  —
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground transition-colors duration-200">
                                {formatDateTime(user.created_at)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground transition-colors duration-200">
                                {formatDateTime(user.updated_at)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <UserActionMenu
                                user={user}
                                onView={handleViewUser}
                                onEdit={handleEditUser}
                                onImpersonate={handleImpersonateUser}
                                isLoadingDetails={loadingUserDetails}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rate-limiting" id="rate-limiting">
            <RateLimitMonitoring token={token || ""} />
          </TabsContent>

          <TabsContent value="faq-management" id="faq-management">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    FAQ Management
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Manage FAQ categories, items, and latest updates displayed
                    on the public FAQ page.
                  </p>
                </div>
              </div>
              <CategoryManager token={token || ""} />
              <FAQItemManager token={token || ""} />
              <UpdatesManager token={token || ""} />
            </div>
          </TabsContent>

          <TabsContent value="platform" id="platform">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Platform Settings
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Configure platform-wide settings including availability
                    schedules and general configuration.
                  </p>
                </div>
              </div>

              <Tabs defaultValue="availability" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
                  <TabsTrigger value="availability">Availability</TabsTrigger>
                  <TabsTrigger value="theme">Theme</TabsTrigger>
                </TabsList>

                <TabsContent value="availability">
                  <PlatformAvailabilityManager />
                </TabsContent>

                <TabsContent value="theme">
                  <div className="bg-card shadow sm:rounded-lg">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Palette className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h2 className="text-lg font-medium text-foreground">
                            Theme Manager
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            Choose a theme preset. Updates roll out to every
                            user instantly.
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {themeConfigLoading
                          ? "Syncing..."
                          : `Last updated: ${formattedThemeUpdatedAt}`}
                      </div>
                    </div>
                    <div className="space-y-10 px-6 py-6">
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Presets
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Choose a built-in palette. Applying a preset changes
                          the experience for every organization member.
                        </p>
                        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                          {themes.map((preset) => {
                            const isActive = preset.id === themeId;
                            const isSaving = savingPresetId === preset.id;
                            const disabled =
                              (savingPresetId !== null &&
                                savingPresetId !== preset.id) ||
                              themeConfigLoading;

                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => handlePresetSelection(preset)}
                                disabled={disabled}
                                className={`relative w-full rounded-lg border p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-opacity-40 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${isActive
                                  ? "border-primary ring-2 ring-primary ring-opacity-20"
                                  : "border-border hover:border-primary"
                                  } ${disabled
                                    ? "cursor-not-allowed opacity-60"
                                    : ""
                                  }`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <h3 className="text-base font-semibold text-foreground">
                                      {preset.label}
                                    </h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      {preset.description}
                                    </p>
                                  </div>
                                  <Badge
                                    variant={isActive ? "default" : "outline"}
                                  >
                                    {isSaving
                                      ? "Saving..."
                                      : isActive
                                        ? "Active"
                                        : "Preview"}
                                  </Badge>
                                </div>
                                <div className="mt-4 flex gap-4">
                                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                    <span>Primary</span>
                                    <span
                                      className="h-10 w-10 rounded-md border shadow-sm"
                                      style={{
                                        backgroundColor: `hsl(${preset.light.primary})`,
                                      }}
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                    <span>Surface</span>
                                    <span
                                      className="h-10 w-10 rounded-md border shadow-sm"
                                      style={{
                                        backgroundColor: `hsl(${preset.light.background})`,
                                      }}
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                    <span>Dark Primary</span>
                                    <span
                                      className="h-10 w-10 rounded-md border shadow-sm"
                                      style={{
                                        backgroundColor: `hsl(${preset.dark.primary})`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          <TabsContent value="contact-management" id="contact-management">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <ClipboardList className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Contact Management
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Manage contact page content including categories, contact
                    methods, and availability schedules.
                  </p>
                </div>
              </div>

              <Tabs defaultValue="categories" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
                  <TabsTrigger value="categories">Categories</TabsTrigger>
                  <TabsTrigger value="methods">Contact Methods</TabsTrigger>
                  <TabsTrigger value="availability">Availability</TabsTrigger>
                </TabsList>

                <TabsContent value="categories">
                  <ContactCategoryManager token={token || ""} />
                </TabsContent>

                <TabsContent value="methods">
                  <ContactMethodManager token={token || ""} />
                </TabsContent>

                <TabsContent value="availability">
                  <PlatformAvailabilityManager />
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          <TabsContent value="stackscripts" id="stackscripts">
            <Card>
              <CardHeader className="flex flex-col gap-4 border-b border-border pb-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <FileCode className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg font-semibold text-foreground">
                        Manage StackScripts
                      </CardTitle>
                      <CardDescription>
                        Configure which scripts show up when organizations
                        provision new VPS instances.
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchStackscriptsAndConfigs}
                    disabled={loadingStackscripts}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {loadingStackscripts ? "Refreshing…" : "Refresh"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="stackscript-search">
                    Search StackScripts
                  </Label>
                  <Input
                    id="stackscript-search"
                    placeholder="Search StackScripts by name or description"
                    value={stackscriptSearch}
                    onChange={(e) => setStackscriptSearch(e.target.value)}
                  />
                </div>

                <div className="space-y-4">
                  {loadingStackscripts ? (
                    <div className="flex items-center gap-3 rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                      Loading StackScripts…
                    </div>
                  ) : filteredAvailableStackscripts.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                      No StackScripts match your search.
                    </div>
                  ) : (
                    filteredAvailableStackscripts.map((script) => {
                      const config = stackscriptConfigs.find(
                        (c) => c.stackscript_id === script.id
                      );
                      const draft = stackscriptDrafts[script.id] || {
                        label: config?.label || script.label,
                        description:
                          config?.description || script.description || "",
                        display_order: config?.display_order ?? 0,
                        is_enabled: config?.is_enabled ?? false,
                      };
                      const hasChanges =
                        config &&
                        (draft.label !== (config.label || script.label) ||
                          draft.description !== (config.description || "") ||
                          draft.display_order !== config.display_order ||
                          draft.is_enabled !== config.is_enabled);
                      const isNew = !config;

                      return (
                        <div
                          key={script.id}
                          className="rounded-lg border border-border bg-muted/40 p-4"
                        >
                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                            <div className="flex items-start gap-3 lg:col-span-2">
                              <Checkbox
                                id={`stackscript-${script.id}`}
                                checked={draft.is_enabled}
                                onCheckedChange={(checked) => {
                                  const updated = {
                                    ...draft,
                                    is_enabled: Boolean(checked),
                                  };
                                  setStackscriptDrafts((prev) => ({
                                    ...prev,
                                    [script.id]: updated,
                                  }));
                                }}
                              />
                              <div className="space-y-2">
                                <Label
                                  htmlFor={`stackscript-${script.id}`}
                                  className="text-sm font-medium text-foreground"
                                >
                                  {script.label}
                                </Label>
                                <Badge
                                  variant={
                                    draft.is_enabled ? "default" : "secondary"
                                  }
                                >
                                  {draft.is_enabled ? "Enabled" : "Hidden"}
                                </Badge>
                              </div>
                            </div>
                            <div className="space-y-3 lg:col-span-7">
                              <div className="grid gap-2">
                                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                                  Display Label
                                </Label>
                                <Input
                                  value={draft.label}
                                  onChange={(e) => {
                                    const updated = {
                                      ...draft,
                                      label: e.target.value,
                                    };
                                    setStackscriptDrafts((prev) => ({
                                      ...prev,
                                      [script.id]: updated,
                                    }));
                                  }}
                                  placeholder={script.label}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                                  Description
                                </Label>
                                <Textarea
                                  value={draft.description}
                                  onChange={(e) => {
                                    const updated = {
                                      ...draft,
                                      description: e.target.value,
                                    };
                                    setStackscriptDrafts((prev) => ({
                                      ...prev,
                                      [script.id]: updated,
                                    }));
                                  }}
                                  placeholder={
                                    script.description || "No description"
                                  }
                                  rows={2}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground">
                                ID {script.id} • Images{" "}
                                {script.images
                                  ?.map((img: string) =>
                                    img.replace(/^linode\//i, "")
                                  )
                                  .join(", ") || "Any"}
                              </p>
                            </div>
                            <div className="flex flex-col gap-3 lg:col-span-3">
                              <div className="grid gap-2">
                                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                                  Display order
                                </Label>
                                <Input
                                  type="number"
                                  value={draft.display_order}
                                  onChange={(e) => {
                                    const updated = {
                                      ...draft,
                                      display_order: Number(e.target.value),
                                    };
                                    setStackscriptDrafts((prev) => ({
                                      ...prev,
                                      [script.id]: updated,
                                    }));
                                  }}
                                />
                              </div>
                              <Button
                                onClick={() =>
                                  saveStackscriptConfig(script.id, draft)
                                }
                                disabled={
                                  savingStackscriptId === script.id ||
                                  (!hasChanges && !isNew)
                                }
                              >
                                {savingStackscriptId === script.id
                                  ? "Saving…"
                                  : isNew
                                    ? "Save & Enable"
                                    : "Save changes"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="container-plans" id="container-plans">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                    <Server className="h-5 w-5 text-muted-foreground" />
                    Container Pricing
                  </CardTitle>
                  <CardDescription>
                    Tune the smart pricing formula that powers container-based
                    workloads.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                    <div className="space-y-2">
                      <Label htmlFor="price-per-cpu">Per CPU</Label>
                      <Input
                        id="price-per-cpu"
                        type="number"
                        step="0.01"
                        value={pricing.price_per_cpu}
                        onChange={(e) =>
                          setPricing((p) => ({
                            ...p,
                            price_per_cpu: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price-per-ram">Per RAM GB</Label>
                      <Input
                        id="price-per-ram"
                        type="number"
                        step="0.01"
                        value={pricing.price_per_ram_gb}
                        onChange={(e) =>
                          setPricing((p) => ({
                            ...p,
                            price_per_ram_gb: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price-per-storage">Per Storage GB</Label>
                      <Input
                        id="price-per-storage"
                        type="number"
                        step="0.01"
                        value={pricing.price_per_storage_gb}
                        onChange={(e) =>
                          setPricing((p) => ({
                            ...p,
                            price_per_storage_gb: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price-per-mbps">Per Mbps</Label>
                      <Input
                        id="price-per-mbps"
                        type="number"
                        step="0.01"
                        value={pricing.price_per_network_mbps}
                        onChange={(e) =>
                          setPricing((p) => ({
                            ...p,
                            price_per_network_mbps: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pricing-currency">Currency</Label>
                      <Input
                        id="pricing-currency"
                        value={pricing.currency}
                        onChange={(e) =>
                          setPricing((p) => ({
                            ...p,
                            currency: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={savePricing}
                    className="gap-2"
                  >
                    Save Pricing
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader className="gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold text-foreground">
                        Container Plans
                      </CardTitle>
                      <CardDescription>
                        Build opinionated presets for lightweight container
                        workloads.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-lg border border-border bg-muted/40 p-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
                      <div className="space-y-2">
                        <Label htmlFor="container-plan-name">Name</Label>
                        <Input
                          id="container-plan-name"
                          placeholder="Plan name"
                          value={newContainerPlan.name as string}
                          onChange={(e) =>
                            setNewContainerPlan((p) => ({
                              ...p,
                              name: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="container-plan-cpu">CPU Cores</Label>
                        <Input
                          id="container-plan-cpu"
                          type="number"
                          min={1}
                          value={newContainerPlan.cpu_cores as number}
                          onChange={(e) =>
                            setNewContainerPlan((p) => ({
                              ...p,
                              cpu_cores: Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="container-plan-ram">RAM (GB)</Label>
                        <Input
                          id="container-plan-ram"
                          type="number"
                          min={1}
                          value={newContainerPlan.ram_gb as number}
                          onChange={(e) =>
                            setNewContainerPlan((p) => ({
                              ...p,
                              ram_gb: Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="container-plan-storage">
                          Storage (GB)
                        </Label>
                        <Input
                          id="container-plan-storage"
                          type="number"
                          min={1}
                          value={newContainerPlan.storage_gb as number}
                          onChange={(e) =>
                            setNewContainerPlan((p) => ({
                              ...p,
                              storage_gb: Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="container-plan-network">
                          Network (Mbps)
                        </Label>
                        <Input
                          id="container-plan-network"
                          type="number"
                          min={0}
                          value={newContainerPlan.network_mbps as number}
                          onChange={(e) =>
                            setNewContainerPlan((p) => ({
                              ...p,
                              network_mbps: Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          className="w-full gap-2"
                          onClick={createContainerPlan}
                        >
                          <Plus className="h-4 w-4" />
                          Add Plan
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>CPU</TableHead>
                          <TableHead>RAM</TableHead>
                          <TableHead>Storage</TableHead>
                          <TableHead>Network</TableHead>
                          <TableHead>Estimated Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {containerPlans.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="py-8 text-center text-muted-foreground"
                            >
                              No container plans have been created yet.
                            </TableCell>
                          </TableRow>
                        ) : (
                          containerPlans.map((plan) => (
                            <TableRow key={plan.id}>
                              <TableCell className="font-medium text-foreground">
                                {plan.name}
                              </TableCell>
                              <TableCell>{plan.cpu_cores}</TableCell>
                              <TableCell>{plan.ram_gb} GB</TableCell>
                              <TableCell>{plan.storage_gb} GB</TableCell>
                              <TableCell>{plan.network_mbps} Mbps</TableCell>
                              <TableCell>
                                ${computeContainerPlanPrice(plan).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    plan.active ? "default" : "secondary"
                                  }
                                >
                                  {plan.active ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditContainerPlanId(plan.id);
                                      setEditContainerPlan(plan);
                                    }}
                                    className="gap-1"
                                  >
                                    <Edit className="h-4 w-4" /> Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() =>
                                      setDeleteContainerPlanId(plan.id)
                                    }
                                    className="gap-1"
                                  >
                                    <Trash2 className="h-4 w-4" /> Delete
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="containers" id="containers">
            <Card>
              <CardHeader className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                    <Box className="h-5 w-5 text-muted-foreground" />
                    Containers
                  </CardTitle>
                  <CardDescription>
                    Audit container workloads across all organizations.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={fetchAdminContainers}
                  disabled={containerInstancesLoading}
                >
                  <RefreshCw className="h-4 w-4" />
                  {containerInstancesLoading ? "Refreshing…" : "Refresh"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div className="w-full md:w-80">
                    <Label htmlFor="container-search">Search</Label>
                    <div className="relative mt-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="container-search"
                        placeholder="Search by name, organization, or creator"
                        value={containerSearch}
                        onChange={(e) => setContainerSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="w-full md:w-56">
                    <Label htmlFor="container-status">Status</Label>
                    <Select
                      value={containerStatusFilter}
                      onValueChange={(value) => setContainerStatusFilter(value)}
                    >
                      <SelectTrigger id="container-status" className="mt-1">
                        <SelectValue placeholder="All status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        {containerStatusOptions.map((status) => (
                          <SelectItem key={status} value={status.toLowerCase()}>
                            {formatStatusLabel(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[14rem]">Name</TableHead>
                        <TableHead className="min-w-[12rem]">
                          Organization
                        </TableHead>
                        <TableHead className="w-32">Status</TableHead>
                        <TableHead className="min-w-[12rem]">Image</TableHead>
                        <TableHead className="min-w-[12rem]">Created</TableHead>
                        <TableHead className="min-w-[12rem]">Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {containerInstancesLoading ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="py-10 text-center text-muted-foreground"
                          >
                            Loading containers…
                          </TableCell>
                        </TableRow>
                      ) : filteredContainerInstances.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="py-10 text-center text-muted-foreground"
                          >
                            No containers match the current filters.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredContainerInstances.map((instance) => (
                          <TableRow key={instance.id} className="align-top">
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium text-foreground">
                                  {instance.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Created by{" "}
                                  {instance.creator_name ||
                                    instance.creator_email ||
                                    "Unknown"}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="text-sm text-foreground">
                                  {instance.organization_name || "—"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {instance.organization_slug ||
                                    instance.organization_id}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={statusBadgeClass(instance.status)}
                              >
                                {formatStatusLabel(instance.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-muted-foreground">
                                {instance.image || "—"}
                              </p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-muted-foreground">
                                {formatDateTime(instance.created_at)}
                              </p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-muted-foreground">
                                {formatDateTime(instance.updated_at)}
                              </p>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="servers" id="servers">
            <Card>
              <CardHeader className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                    <ServerCog className="h-5 w-5 text-muted-foreground" />
                    Servers
                  </CardTitle>
                  <CardDescription>
                    Monitor VPS instances provisioned through the platform.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={fetchServers}
                  disabled={serversLoading}
                >
                  <RefreshCw className="h-4 w-4" />
                  {serversLoading ? "Refreshing…" : "Refresh"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                  <div className="w-full xl:w-96">
                    <Label htmlFor="server-search">Search</Label>
                    <div className="relative mt-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="server-search"
                        placeholder="Search by label, IP, organization, or plan"
                        value={serverSearch}
                        onChange={(e) => setServerSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="w-full xl:w-56">
                    <Label htmlFor="server-status">Status</Label>
                    <Select
                      value={serverStatusFilter}
                      onValueChange={(value) => setServerStatusFilter(value)}
                    >
                      <SelectTrigger id="server-status" className="mt-1">
                        <SelectValue placeholder="All status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        {serverStatusOptions.map((status) => (
                          <SelectItem key={status} value={status.toLowerCase()}>
                            {formatStatusLabel(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[14rem]">Label</TableHead>
                        <TableHead className="min-w-[12rem]">
                          Organization
                        </TableHead>
                        <TableHead className="w-32">Status</TableHead>
                        <TableHead className="min-w-[10rem]">
                          IP Address
                        </TableHead>
                        <TableHead className="min-w-[12rem]">Plan</TableHead>
                        <TableHead className="min-w-[10rem]">Region</TableHead>
                        <TableHead className="min-w-[10rem]">
                          Provider
                        </TableHead>
                        <TableHead className="min-w-[12rem]">Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serversLoading ? (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="py-10 text-center text-muted-foreground"
                          >
                            Loading servers…
                          </TableCell>
                        </TableRow>
                      ) : filteredServers.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="py-10 text-center text-muted-foreground"
                          >
                            No servers match the current filters.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredServers.map((server) => {
                          const specRecord =
                            server.plan_specifications &&
                              typeof server.plan_specifications === "object"
                              ? (server.plan_specifications as Record<
                                string,
                                unknown
                              >)
                              : null;
                          const readNumber = (key: string) => {
                            if (!specRecord) return undefined;
                            const raw = specRecord[key];
                            if (typeof raw === "number") return raw;
                            if (typeof raw === "string") {
                              const parsed = Number(raw);
                              return Number.isFinite(parsed)
                                ? parsed
                                : undefined;
                            }
                            return undefined;
                          };
                          const specParts: string[] = [];
                          const vcpus =
                            readNumber("vcpus") ??
                            readNumber("cpu") ??
                            readNumber("cores");
                          const memory =
                            readNumber("memory") ??
                            readNumber("memory_mb") ??
                            readNumber("ram");
                          const disk =
                            readNumber("disk") ?? readNumber("storage");
                          const transfer =
                            readNumber("transfer") ?? readNumber("bandwidth");
                          if (typeof vcpus !== "undefined") {
                            specParts.push(`${vcpus} vCPU`);
                          }
                          if (typeof memory !== "undefined") {
                            specParts.push(`${memory} MB RAM`);
                          }
                          if (typeof disk !== "undefined") {
                            specParts.push(`${disk} GB Disk`);
                          }
                          if (typeof transfer !== "undefined") {
                            specParts.push(`${transfer} TB Transfer`);
                          }
                          const specSummary =
                            specParts.length > 0 ? specParts.join(" • ") : "—";
                          const configurationRecord =
                            server.configuration &&
                              typeof server.configuration === "object"
                              ? (server.configuration as Record<
                                string,
                                unknown
                              >)
                              : null;
                          const regionValue = configurationRecord
                            ? configurationRecord["region"]
                            : undefined;
                          const region =
                            typeof regionValue === "string"
                              ? regionValue
                              : null;

                          return (
                            <TableRow key={server.id} className="align-top">
                              <TableCell>
                                <div className="space-y-1">
                                  <p className="font-medium text-foreground">
                                    {server.label}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Provider ID #{server.provider_instance_id}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <p className="text-sm text-foreground">
                                    {server.organization_name || "—"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {server.organization_slug ||
                                      server.organization_id}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={statusBadgeClass(server.status)}
                                >
                                  {formatStatusLabel(server.status)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <p className="text-sm text-muted-foreground">
                                  {server.ip_address || "—"}
                                </p>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <p className="text-sm text-foreground">
                                    {server.plan_name ||
                                      server.plan_provider_plan_id ||
                                      server.plan_id}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {specSummary}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <p className="text-sm text-muted-foreground">
                                  {server.region_label || region || "—"}
                                </p>
                              </TableCell>
                              <TableCell>
                                <p className="text-sm text-muted-foreground">
                                  {server.provider_name || "—"}
                                </p>
                              </TableCell>
                              <TableCell>
                                <p className="text-sm text-muted-foreground">
                                  {formatDateTime(server.updated_at)}
                                </p>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="networking" id="networking">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  Networking Controls
                </CardTitle>
                <CardDescription>
                  Configure reverse DNS defaults and other networking
                  guardrails.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs
                  value={networkingTab}
                  onValueChange={(value) =>
                    setNetworkingTab(value as typeof networkingTab)
                  }
                >
                  <TabsList>
                    <TabsTrigger value="rdns">Reverse DNS</TabsTrigger>
                    <TabsTrigger value="ipam">IP Management</TabsTrigger>
                  </TabsList>
                  <TabsContent value="rdns" className="space-y-6 pt-6">
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">
                          Reverse DNS Template
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Define the base domain used when setting custom rDNS
                          for VPS instances. If unset, the system falls back to{" "}
                          <span className="font-mono">
                            ip.rev.skyvps360.xyz
                          </span>
                          .
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="rdns-domain">rDNS base domain</Label>
                          <Input
                            id="rdns-domain"
                            value={rdnsBaseDomain}
                            onChange={(e) => setRdnsBaseDomain(e.target.value)}
                            placeholder="ip.rev.skyvps360.xyz"
                            disabled={rdnsLoading}
                          />
                          <p className="text-xs text-muted-foreground">
                            Example final rDNS:{" "}
                            <span className="font-mono">
                              123-45-67-89.
                              {rdnsBaseDomain || "ip.rev.skyvps360.xyz"}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          onClick={saveNetworkingRdns}
                          disabled={rdnsSaving || rdnsLoading}
                          className="gap-2"
                        >
                          {rdnsSaving ? "Saving…" : "Save rDNS Template"}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="ipam" className="space-y-6 pt-6">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-base font-semibold text-foreground mb-2">
                          IP Address Management (IPAM)
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Manage IPv4 and IPv6 addresses allocated across your
                          Linode infrastructure.
                        </p>
                      </div>

                      {/* IP Allocation Overview */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">
                              Total IPs
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-foreground">
                              {servers.length > 0 ? servers.length : "0"}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Allocated addresses
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">
                              IPv4
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-foreground">
                              {servers.filter((s) => s.ip_address).length}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Active IPv4 addresses
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">
                              IPv6
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-foreground">
                              {
                                servers.filter((s) => s.configuration?.ipv6)
                                  .length
                              }
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Active IPv6 ranges
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* IP Address Table */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">
                            IP Addresses
                          </CardTitle>
                          <CardDescription>
                            View and manage IP addresses across all VPS
                            instances
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Instance ID</TableHead>
                                  <TableHead>Label</TableHead>
                                  <TableHead>IPv4 Address</TableHead>
                                  <TableHead>IPv6 Range</TableHead>
                                  <TableHead>Region</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {servers.length === 0 ? (
                                  <TableRow>
                                    <TableCell
                                      colSpan={6}
                                      className="text-center py-8 text-muted-foreground"
                                    >
                                      No servers found. Deploy a VPS to see IP
                                      allocations.
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  servers.map((server) => (
                                    <TableRow key={server.id}>
                                      <TableCell className="font-mono text-xs">
                                        {server.provider_instance_id ||
                                          server.id}
                                      </TableCell>
                                      <TableCell className="font-medium">
                                        {server.label || "Unnamed Instance"}
                                      </TableCell>
                                      <TableCell className="font-mono text-sm">
                                        {server.ip_address || (
                                          <span className="text-muted-foreground">
                                            N/A
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell className="font-mono text-xs">
                                        {server.configuration?.ipv6 ? (
                                          <span
                                            className="block max-w-[200px] truncate"
                                            title={String(
                                              server.configuration.ipv6
                                            )}
                                          >
                                            {String(server.configuration.ipv6)}
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground">
                                            N/A
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-sm">
                                        {String(
                                          server.configuration?.region ||
                                          "Unknown"
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          variant={
                                            server.status === "running"
                                              ? "default"
                                              : "secondary"
                                          }
                                        >
                                          {server.status || "Unknown"}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>

                          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                            <div>
                              Showing {servers.length} instance
                              {servers.length !== 1 ? "s" : ""}
                            </div>
                            <div className="flex items-center gap-2">
                              <span>IP data synced from Linode API</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Additional IPAM Information */}
                      <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
                        <CardContent className="pt-6">
                          <div className="flex gap-3">
                            <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                            <div className="space-y-2">
                              <h4 className="font-medium text-foreground">
                                About IP Management
                              </h4>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                IP addresses are automatically allocated when
                                you create VPS instances. Each instance receives
                                a public IPv4 address and an IPv6 range. You can
                                configure reverse DNS (rDNS) for these IPs in
                                the rDNS tab. All IP information is synced in
                                real-time from the Linode API.
                              </p>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                Note: Instance IDs shown here do not expose
                                sensitive internal identifiers and are safe for
                                status monitoring purposes.
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="providers" id="providers">
            <Card>
              <CardHeader className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-lg font-semibold text-foreground">
                      Service Providers
                    </CardTitle>
                    <CardDescription>
                      Bring your own infrastructure credentials and control
                      access centrally.
                    </CardDescription>
                  </div>
                </div>
                <Button
                  onClick={() => setShowAddProvider(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" /> Add Provider
                </Button>
              </CardHeader>
              <CardContent className="px-0">
                <div className="overflow-x-auto">
                  <DndContext
                    sensors={providerSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleProviderDragEnd}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8"></TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Validation</TableHead>
                          <TableHead>Last API Call</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {providers.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="py-10 text-center text-muted-foreground"
                            >
                              No providers configured yet.
                            </TableCell>
                          </TableRow>
                        ) : (
                          <SortableContext
                            items={providers.map((p) => p.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {providers.map((provider) => (
                              <SortableProviderRow
                                key={provider.id}
                                provider={provider}
                                validatingProviderId={validatingProviderId}
                                onValidate={validateProvider}
                                onEdit={(provider) => {
                                  setEditProviderId(provider.id);
                                  setEditProvider(provider);
                                }}
                                onDelete={(id) => setDeleteProviderId(id)}
                              />
                            ))}
                          </SortableContext>
                        )}
                      </TableBody>
                    </Table>
                  </DndContext>
                </div>
              </CardContent>
            </Card>

            <Dialog
              open={showAddProvider}
              onOpenChange={(open) => {
                setShowAddProvider(open);
                if (!open) {
                  setNewProvider({
                    name: "",
                    type: "",
                    apiKey: "",
                    active: true,
                  });
                }
              }}
            >
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Service Provider</DialogTitle>
                  <DialogDescription>
                    Save provider credentials securely. Only active providers
                    can be used for new workloads.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="provider-name">Name</Label>
                    <Input
                      id="provider-name"
                      placeholder="e.g. Linode Production"
                      value={newProvider.name}
                      onChange={(e) =>
                        setNewProvider((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      A friendly name to identify this provider configuration
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="provider-type">Provider Type</Label>
                    <Select
                      value={newProvider.type}
                      onValueChange={(value) =>
                        setNewProvider((prev) => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger id="provider-type">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="linode">Linode / Akamai</SelectItem>
                        <SelectItem value="digitalocean">
                          DigitalOcean
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="provider-key">
                      API{" "}
                      {newProvider.type === "digitalocean" ? "Token" : "Key"}
                    </Label>
                    <Input
                      id="provider-key"
                      type="password"
                      placeholder={
                        newProvider.type === "digitalocean"
                          ? "dop_v1_..."
                          : newProvider.type === "linode"
                            ? "Enter Linode API token"
                            : "Enter API credentials"
                      }
                      value={newProvider.apiKey}
                      onChange={(e) =>
                        setNewProvider((prev) => ({
                          ...prev,
                          apiKey: e.target.value,
                        }))
                      }
                    />
                    {newProvider.type === "digitalocean" && (
                      <p className="text-xs text-muted-foreground">
                        Generate a Personal Access Token from your DigitalOcean
                        account with read/write permissions
                      </p>
                    )}
                    {newProvider.type === "linode" && (
                      <p className="text-xs text-muted-foreground">
                        Create an API token from your Linode Cloud Manager with
                        full access permissions
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Enable Provider
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Inactive providers stay stored but hidden from
                        provisioning.
                      </p>
                    </div>
                    <Switch
                      checked={newProvider.active}
                      onCheckedChange={(checked) =>
                        setNewProvider((prev) => ({ ...prev, active: checked }))
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddProvider(false);
                      setNewProvider({
                        name: "",
                        type: "",
                        apiKey: "",
                        active: true,
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={createProvider}
                    disabled={
                      !newProvider.name ||
                      !newProvider.type ||
                      !newProvider.apiKey
                    }
                  >
                    Add Provider
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </div>
      </Tabs>

      <Dialog
        open={Boolean(editContainerPlanId)}
        onOpenChange={(open) => {
          if (!open) {
            setEditContainerPlanId(null);
            setEditContainerPlan({});
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Container Plan</DialogTitle>
            <DialogDescription>
              Adjust resources and visibility for this container preset.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-container-name">Name</Label>
              <Input
                id="edit-container-name"
                value={(editContainerPlan.name as string) || ""}
                onChange={(e) =>
                  setEditContainerPlan((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="edit-container-cpu">CPU Cores</Label>
                <Input
                  id="edit-container-cpu"
                  type="number"
                  min={1}
                  value={editContainerPlan.cpu_cores ?? ""}
                  onChange={(e) =>
                    setEditContainerPlan((prev) => ({
                      ...prev,
                      cpu_cores: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-container-ram">RAM (GB)</Label>
                <Input
                  id="edit-container-ram"
                  type="number"
                  min={1}
                  value={editContainerPlan.ram_gb ?? ""}
                  onChange={(e) =>
                    setEditContainerPlan((prev) => ({
                      ...prev,
                      ram_gb: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="edit-container-storage">Storage (GB)</Label>
                <Input
                  id="edit-container-storage"
                  type="number"
                  min={1}
                  value={editContainerPlan.storage_gb ?? ""}
                  onChange={(e) =>
                    setEditContainerPlan((prev) => ({
                      ...prev,
                      storage_gb: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-container-network">Network (Mbps)</Label>
                <Input
                  id="edit-container-network"
                  type="number"
                  min={0}
                  value={editContainerPlan.network_mbps ?? ""}
                  onChange={(e) =>
                    setEditContainerPlan((prev) => ({
                      ...prev,
                      network_mbps: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-container-price">Price (USD)</Label>
              <Input
                id="edit-container-price"
                type="number"
                step="0.01"
                value={editContainerPlan.base_price ?? ""}
                onChange={(e) =>
                  setEditContainerPlan((prev) => ({
                    ...prev,
                    base_price: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Active</p>
                <p className="text-xs text-muted-foreground">
                  Toggle visibility without deleting the plan.
                </p>
              </div>
              <Switch
                checked={Boolean(editContainerPlan.active ?? false)}
                onCheckedChange={(checked) =>
                  setEditContainerPlan((prev) => ({ ...prev, active: checked }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditContainerPlanId(null);
                setEditContainerPlan({});
              }}
            >
              Cancel
            </Button>
            <Button onClick={updateContainerPlan}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editProviderId)}
        onOpenChange={(open) => {
          if (!open) {
            setEditProviderId(null);
            setEditProvider({});
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Provider</DialogTitle>
            <DialogDescription>
              Update metadata or disable this provider without removing
              credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-provider-name">Name</Label>
              <Input
                id="edit-provider-name"
                value={(editProvider.name as string) || ""}
                onChange={(e) =>
                  setEditProvider((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>Provider Type</Label>
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
                <span className="text-sm font-medium capitalize">
                  {editProvider.type}
                </span>
              </div>
            </div>

            {editProvider.validation_status && (
              <div className="grid gap-2">
                <Label>Validation Status</Label>
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
                  {editProvider.validation_status === "valid" && (
                    <Badge
                      variant="default"
                      className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    >
                      <CheckCircle className="h-3 w-3" /> Valid
                    </Badge>
                  )}
                  {editProvider.validation_status === "invalid" && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" /> Invalid
                    </Badge>
                  )}
                  {editProvider.validation_status === "pending" && (
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" /> Pending
                    </Badge>
                  )}
                  {editProvider.validation_message && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {editProvider.validation_message}
                    </span>
                  )}
                </div>
              </div>
            )}

            {editProvider.last_api_call && (
              <div className="grid gap-2">
                <Label>Last API Call</Label>
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {new Date(editProvider.last_api_call).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Enable Provider
                </p>
                <p className="text-xs text-muted-foreground">
                  Only active providers are available during provisioning.
                </p>
              </div>
              <Switch
                checked={Boolean(editProvider.active ?? false)}
                onCheckedChange={(checked) =>
                  setEditProvider((prev) => ({ ...prev, active: checked }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditProviderId(null);
                setEditProvider({});
              }}
            >
              Cancel
            </Button>
            <Button onClick={updateProvider}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTicketId)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTicketId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the conversation and all replies. You
              cannot recover this ticket afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTicketId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTicketId) {
                  void deleteTicket(deleteTicketId);
                }
              }}
              className={buttonVariants({ variant: "destructive" })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deletePlanId)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletePlanId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete VPS plan?</AlertDialogTitle>
            <AlertDialogDescription>
              Removing this plan hides it from customers immediately. You can
              recreate it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletePlanId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletePlanId) {
                  void deleteVPSPlan(deletePlanId);
                }
              }}
              className={buttonVariants({ variant: "destructive" })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteContainerPlanId)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteContainerPlanId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete container plan?</AlertDialogTitle>
            <AlertDialogDescription>
              Removing this plan takes it out of circulation for new
              deployments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteContainerPlanId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteContainerPlanId) {
                  void deleteContainerPlan(deleteContainerPlanId);
                }
              }}
              className={buttonVariants({ variant: "destructive" })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteProviderId)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteProviderId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove provider?</AlertDialogTitle>
            <AlertDialogDescription>
              Deleting a provider wipes stored credentials. Running workloads
              remain active but new deployments cannot target this provider.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteProviderId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteProviderId) {
                  void deleteProvider(deleteProviderId);
                }
              }}
              className={buttonVariants({ variant: "destructive" })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Profile Modal */}
      <UserProfileModal
        user={selectedUserForProfile}
        isOpen={userProfileModalOpen}
        onClose={handleCloseUserProfileModal}
      />

      {/* User Edit Modal */}
      <UserEditModal
        user={selectedUserForEdit}
        isOpen={userEditModalOpen}
        onClose={handleCloseUserEditModal}
        onSave={handleSaveUserUpdate}
        isSaving={savingUserUpdate}
      />

      {/* Admin Impersonation Confirmation Dialog */}
      <AlertDialog
        open={impersonationConfirmDialog.isOpen}
        onOpenChange={(open) => !open && handleCancelAdminImpersonation()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Admin Impersonation
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to impersonate another administrator account. This
              action will:
              <ul className="mt-2 ml-4 list-disc space-y-1">
                <li>Give you full access to their admin privileges</li>
                <li>Log this activity for security audit purposes</li>
                <li>Allow you to perform actions as this admin user</li>
              </ul>
              <div className="mt-3 p-3 bg-muted rounded-md">
                <strong>Target Admin:</strong>{" "}
                {impersonationConfirmDialog.targetUser?.name} (
                {impersonationConfirmDialog.targetUser?.email})
              </div>
              Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelAdminImpersonation}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAdminImpersonation}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Yes, Impersonate Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
