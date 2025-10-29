/**
 * VPS Management Page
 * Handles Linode VPS instance creation, management, and monitoring
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import type { RowSelectionState } from "@tanstack/react-table";
import {
  Plus,
  RefreshCw,
  Search,
  DollarSign,
  Power,
  PowerOff,
  Copy,
  Trash2,
  RotateCcw,
  Cpu,
  Server,
  HardDrive,
  Network,
  MemoryStick,
} from "lucide-react";
import { toast } from "sonner";
import type { ProviderType } from "@/types/provider";
import type { CreateVPSForm, VPSInstance } from "@/types/vps";
import { useAuth } from "@/contexts/AuthContext";
import { useFormPersistence } from "@/hooks/use-form-persistence";
import { useMobileNavigation } from "@/hooks/use-mobile-navigation";
import { useLazyLoading, createMobileLoadingFallback } from "@/hooks/use-lazy-loading";
import { useMobilePerformance } from "@/hooks/use-mobile-performance";
import { useMobileAssets } from "@/hooks/use-mobile-assets";
import { useMobileToast } from "@/components/ui/mobile-toast";
import {
  MobileLoading,
  MobileLoadingButton,
  useMobileLoading,
} from "@/components/ui/mobile-loading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogStack } from "@/components/ui/dialog-stack";
import { VpsInstancesTable } from "@/components/VPS/VpsTable";
import { BulkDeleteModal } from "@/components/VPS/BulkDeleteModal";
import { generateUniqueVPSLabel } from "@/lib/vpsLabelGenerator";
import { ProviderSelector } from "@/components/VPS/ProviderSelector";
import { CreateVPSSteps } from "@/components/VPS/CreateVPSSteps";
import { RegionSelector } from "@/components/VPS/RegionSelector";
import {
  getActiveSteps,
  getNextStep,
  getPreviousStep,
  type StepConfiguration,
} from "@/lib/vpsStepConfiguration";
import { paymentService } from "@/services/paymentService";

interface LinodeType {
  id: string;
  label: string;
  disk: number;
  memory: number;
  vcpus: number;
  transfer: number;
  region?: string;
  provider_id?: string;
  price: {
    hourly: number;
    monthly: number;
  };
}

interface LinodeRegion {
  id: string;
  label: string;
  country: string;
}

const VPS: React.FC = () => {
  const [instances, setInstances] = useState<VPSInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [selectedInstances, setSelectedInstances] = useState<VPSInstance[]>([]);
  const [selectedRowSelection, setSelectedRowSelection] =
    useState<RowSelectionState>({});
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState<number>(1);
  const [activeSteps, setActiveSteps] = useState<StepConfiguration[]>([]);
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    id: string;
    label: string;
    input: string;
    password: string;
    confirmCheckbox: boolean;
    loading: boolean;
    error: string;
  }>({
    open: false,
    id: "",
    label: "",
    input: "",
    password: "",
    confirmCheckbox: false,
    loading: false,
    error: "",
  });
  // Form persistence for mobile users
  const {
    data: createForm,
    updateData: setCreateForm,
    save: saveForm,
    clear: _clearForm,
    handleSubmit: handleFormSubmit,
    isDirty: isFormDirty,
    lastSaved,
  } = useFormPersistence<CreateVPSForm>(
    {
      provider_id: "",
      provider_type: "linode" as ProviderType,
      label: "",
      type: "",
      region: "",
      image: "linode/ubuntu22.04",
      rootPassword: "",
      sshKeys: [],
      backups: false,
      privateIP: false,
    },
    {
      key: "vps-creation",
      debounceMs: 1000,
      autoSave: true,
      clearOnSubmit: true,
    }
  );
  const { token, getOrganization } = useAuth();
  const [_organizationName, _setOrganizationName] = useState<string>("vps");

  // Mobile navigation handling
  const { setModalOpen, goBack: _goBack } = useMobileNavigation({
    onBackButton: () => {
      if (showCreateModal) {
        if (isFormDirty) {
          const shouldSave = window.confirm(
            "You have unsaved changes. Would you like to save your progress before going back?"
          );
          if (shouldSave) {
            saveForm();
          }
        }
        setShowCreateModal(false);
        setCreateStep(1);
        return true; // Prevent default back navigation
      }
      return false; // Allow default back navigation
    },
    preventBackOnModal: true,
    confirmBeforeBack: false,
  });

  // Mobile-optimized hooks
  const mobileToast = useMobileToast();
  const mobileLoading = useMobileLoading();
  const { createLazyComponent } = useLazyLoading();
  const { measureRenderTime, getOptimizedSettings } = useMobilePerformance();
  const optimizedSettings = getOptimizedSettings;
  const { isSlowConnection, preloadAsset } = useMobileAssets();

  // Create lazy-loaded components for mobile performance
  const _LazyOSSelection = createLazyComponent(
    () => import("@/components/VPS/LazyOSSelection"),
    {
      fallback: createMobileLoadingFallback(
        "h-32",
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      ),
      mobileOnly: true,
      preload: !isSlowConnection,
    }
  );

  const _LazyDeploymentSelection = createLazyComponent(
    () => import("@/components/VPS/LazyDeploymentSelection"),
    {
      fallback: createMobileLoadingFallback(
        "h-24",
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      ),
      mobileOnly: true,
      preload: !isSlowConnection,
    }
  );

  const _LazyStackScriptConfig = createLazyComponent(
    () => import("@/components/VPS/LazyStackScriptConfig"),
    {
      fallback: createMobileLoadingFallback("h-40"),
      mobileOnly: true,
    }
  );

  // Performance monitoring
  const endRenderMeasurement = measureRenderTime("VPS");

  const [linodeTypes, setLinodeTypes] = useState<LinodeType[]>([]);
  const [linodeImages, setLinodeImages] = useState<any[]>([]);
  const [linodeStackScripts, setLinodeStackScripts] = useState<any[]>([]);
  const [selectedStackScript, setSelectedStackScript] = useState<any | null>(
    null
  );
  const [stackscriptData, setStackscriptData] = useState<Record<string, any>>(
    {}
  );
  // OS selection redesign: tabs, grouping, and per-OS version selection
  const [osTab, setOsTab] = useState<"templates" | "iso">("templates");
  const [selectedOSGroup, setSelectedOSGroup] = useState<string | null>(null);
  const [selectedOSVersion, setSelectedOSVersion] = useState<
    Record<string, string>
  >({});

  // Group Linode images into distributions with versions for cleaner selection cards
  const osGroups = useMemo(() => {
    const groups: Record<
      string,
      {
        name: string;
        key: string;
        versions: Array<{ id: string; label: string }>;
      }
    > = {};
    const add = (key: string, name: string, id: string, label: string) => {
      if (!groups[key]) groups[key] = { key, name, versions: [] };
      groups[key].versions.push({ id, label });
    };
    (linodeImages || []).forEach((img: any) => {
      const id: string = img.id || "";
      const label: string = img.label || id;
      const lower = `${id} ${label}`.toLowerCase();
      // Exclude non-OS entries like Kubernetes/LKE from OS selection
      if (/(^|\s)(kubernetes|lke|k8s)(\s|$)/i.test(lower)) {
        return;
      }
      if (lower.includes("ubuntu")) add("ubuntu", "Ubuntu", id, label);
      else if (lower.includes("centos")) add("centos", "CentOS", id, label);
      else if (lower.includes("alma")) add("almalinux", "AlmaLinux", id, label);
      else if (lower.includes("rocky"))
        add("rockylinux", "Rocky Linux", id, label);
      else if (lower.includes("debian")) add("debian", "Debian", id, label);
      else if (lower.includes("fedora")) add("fedora", "Fedora", id, label);
      else if (lower.includes("alpine")) add("alpine", "Alpine", id, label);
      else if (lower.includes("arch")) add("arch", "Arch Linux", id, label);
      else if (lower.includes("opensuse"))
        add("opensuse", "openSUSE", id, label);
      else if (lower.includes("gentoo")) add("gentoo", "Gentoo", id, label);
      else if (lower.includes("slackware"))
        add("slackware", "Slackware", id, label);
    });
    // Sort versions descending by numeric parts in label to prefer latest first
    Object.values(groups).forEach((g) => {
      g.versions.sort((a, b) =>
        b.label.localeCompare(a.label, undefined, { numeric: true })
      );
    });
    return groups;
  }, [linodeImages]);

  // Constrain visible OS versions when a WordPress StackScript specifies allowed base images
  const effectiveOsGroups = useMemo(() => {
    const allowed = Array.isArray(selectedStackScript?.images)
      ? (selectedStackScript!.images as string[])
      : [];
    if (!selectedStackScript) return osGroups;
    const knownIds = new Set((linodeImages || []).map((i: any) => i.id));
    const allowedKnown = allowed.filter((id: string) => knownIds.has(id));
    // If the StackScript allows any/all (no specific known image IDs), show all OS groups
    if (allowed.length === 0 || allowedKnown.length === 0) return osGroups;
    const allowedSet = new Set(allowedKnown);
    const filtered: typeof osGroups = {} as any;
    Object.entries(osGroups).forEach(([key, group]) => {
      const versions = group.versions.filter((v) => allowedSet.has(v.id));
      if (versions.length > 0) filtered[key] = { ...group, versions };
    });
    return filtered;
  }, [osGroups, selectedStackScript, linodeImages]);

  // Display helper for StackScript allowed images (falls back to Any Linux distribution)
  const allowedImagesDisplay = useMemo(() => {
    if (!selectedStackScript) return "";
    const allowed = Array.isArray(selectedStackScript.images)
      ? (selectedStackScript.images as string[])
      : [];
    const byId = new Map(
      (linodeImages || []).map((img: any) => [img.id, img.label || img.id])
    );
    const knownLabels = allowed
      .filter((id) => byId.has(id))
      .map((id) => String(byId.get(id)).replace(/^linode\//i, ""));
    if (allowed.length === 0 || knownLabels.length === 0)
      return "Any Linux distribution";
    return knownLabels.join(", ");
  }, [selectedStackScript, linodeImages]);

  // Sync default selection to current form image when images load
  useEffect(() => {
    if (!linodeImages || linodeImages.length === 0) return;
    const current = linodeImages.find((i: any) => i.id === createForm.image);
    const src = `${createForm.image} ${current?.label || ""}`.toLowerCase();
    const key = src.includes("ubuntu")
      ? "ubuntu"
      : src.includes("centos")
      ? "centos"
      : src.includes("alma")
      ? "almalinux"
      : src.includes("rocky")
      ? "rockylinux"
      : src.includes("debian")
      ? "debian"
      : src.includes("fedora")
      ? "fedora"
      : src.includes("alpine")
      ? "alpine"
      : src.includes("arch")
      ? "arch"
      : null;
    if (key) {
      setSelectedOSGroup((prev) => prev || key);
      setSelectedOSVersion((prev) => ({ ...prev, [key]: createForm.image }));
    }
  }, [linodeImages, createForm.image]);

  // Regions allowed by admin configuration: derive strictly from configured VPS plans
  const allowedRegions: LinodeRegion[] = useMemo(() => {
    const ids = Array.from(
      new Set(
        (linodeTypes || [])
          .map((t) => t.region)
          .filter(
            (r): r is string => typeof r === "string" && r.trim().length > 0
          )
      )
    );
    return ids.map((id) => ({ id, label: id, country: "" }));
  }, [linodeTypes]);

  // Initialize StackScript data defaults when a script is selected
  useEffect(() => {
    if (
      selectedStackScript &&
      Array.isArray(selectedStackScript.user_defined_fields)
    ) {
      const initial: Record<string, any> = {};
      selectedStackScript.user_defined_fields.forEach((f: any) => {
        if (
          f &&
          typeof f.default !== "undefined" &&
          f.default !== null &&
          String(f.default).length > 0
        ) {
          initial[f.name] = f.default;
        }
      });
      setStackscriptData(initial);
    } else {
      setStackscriptData({});
    }
  }, [selectedStackScript]);

  // Auto-select a compatible image when choosing a StackScript
  useEffect(() => {
    if (!selectedStackScript) return;
    const allowed = Array.isArray(selectedStackScript.images)
      ? (selectedStackScript.images as string[])
      : [];
    const knownIds = new Set((linodeImages || []).map((i: any) => i.id));
    const allowedKnown = allowed.filter((id) => knownIds.has(id));
    // If unrestricted (any/all), don't force-change the current image
    if (allowed.length === 0 || allowedKnown.length === 0) return;
    const current = createForm.image;
    const isAllowed = current && allowedKnown.includes(current);
    const pick = isAllowed ? current : allowedKnown[0];
    if (pick && pick !== current) {
      setCreateForm({ image: pick });
      const src = pick.toLowerCase();
      const key = src.includes("ubuntu")
        ? "ubuntu"
        : src.includes("centos")
        ? "centos"
        : src.includes("alma")
        ? "almalinux"
        : src.includes("rocky")
        ? "rockylinux"
        : src.includes("debian")
        ? "debian"
        : src.includes("fedora")
        ? "fedora"
        : src.includes("alpine")
        ? "alpine"
        : src.includes("arch")
        ? "arch"
        : src.includes("opensuse")
        ? "opensuse"
        : src.includes("gentoo")
        ? "gentoo"
        : src.includes("slackware")
        ? "slackware"
        : null;
      if (key) {
        setSelectedOSGroup(key);
        setSelectedOSVersion((prev) => ({ ...prev, [key]: pick }));
      }
    }
  }, [selectedStackScript, linodeImages, createForm.image, setCreateForm]);

  const loadVPSPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/vps/plans", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to load VPS plans");

      // Map admin plans to LinodeType format
      const mappedPlans: LinodeType[] = (payload.plans || []).map(
        (plan: any) => {
          const specs = plan.specifications || {};
          const basePrice = Number(plan.base_price || 0);
          const markupPrice = Number(plan.markup_price || 0);
          const totalPrice = basePrice + markupPrice;

          // Normalize spec fields from various sources
          const disk =
            (typeof specs.disk === "number" ? specs.disk : undefined) ??
            (typeof specs.storage_gb === "number"
              ? specs.storage_gb
              : undefined) ??
            0;

          const memoryMb =
            (typeof specs.memory === "number" ? specs.memory : undefined) ??
            (typeof specs.memory_gb === "number"
              ? specs.memory_gb * 1024
              : undefined) ??
            0;

          const vcpus =
            (typeof specs.vcpus === "number" ? specs.vcpus : undefined) ??
            (typeof specs.cpu_cores === "number"
              ? specs.cpu_cores
              : undefined) ??
            0;

          const transferGb =
            (typeof specs.transfer === "number" ? specs.transfer : undefined) ??
            (typeof specs.transfer_gb === "number"
              ? specs.transfer_gb
              : undefined) ??
            (typeof specs.bandwidth_gb === "number"
              ? specs.bandwidth_gb
              : undefined) ??
            0;

          const region = plan.region_id || specs.region || "";

          return {
            id: String(plan.id),
            label: `${plan.name} - $${totalPrice.toFixed(2)}/mo`,
            disk: disk,
            memory: memoryMb,
            vcpus: vcpus,
            transfer: transferGb,
            region,
            provider_id: plan.provider_id,
            price: {
              hourly: totalPrice / 730,
              monthly: totalPrice,
            },
          };
        }
      );

      setLinodeTypes(mappedPlans);
    } catch (error: any) {
      console.error("Failed to load VPS plans:", error);
      toast.error(error.message || "Failed to load VPS plans");
    }
  }, [token]);

  const loadLinodeImages = useCallback(async () => {
    try {
      const res = await fetch("/api/vps/images", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to load images");
      setLinodeImages(payload.images || []);
    } catch (error: any) {
      console.error("Failed to load Linode images:", error);
      toast.error(error.message || "Failed to load images");
    }
  }, [token]);

  const loadLinodeStackScripts = useCallback(async () => {
    try {
      // Load admin-configured StackScripts for 1-Click deployments
      const res = await fetch("/api/vps/stackscripts?configured=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok)
        throw new Error(payload.error || "Failed to load stack scripts");

      const scripts = Array.isArray(payload.stackscripts)
        ? payload.stackscripts
        : [];
      setLinodeStackScripts(scripts);

      // Auto-select ssh-key script as default (but display as "None")
      const sshKeyScript = scripts.find(
        (script) =>
          script.label === "ssh-key" ||
          script.id === "ssh-key" ||
          (script.label && script.label.toLowerCase().includes("ssh"))
      );

      if (sshKeyScript) {
        setSelectedStackScript(sshKeyScript);
      }
    } catch (error: any) {
      console.error("Failed to load 1-Click deployments:", error);
      toast.error(error.message || "Failed to load deployments");
    }
  }, [token]);

  const loadInstances = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vps", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok)
        throw new Error(payload.error || "Failed to load VPS instances");

      const clampPercent = (value: unknown): number | null => {
        if (value === null || typeof value === "undefined") return null;
        const numeric = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(numeric)) return null;
        if (numeric < 0) return 0;
        if (numeric > 100) return 100;
        return numeric;
      };

      const mapped: VPSInstance[] = (payload.instances || []).map((i: any) => {
        // Prefer API-provided plan specs/pricing; fallback to loaded plans; else zeros
        const apiSpecs = i.plan_specs || null;
        const apiPricing = i.plan_pricing || null;
        const providerType = (i.provider_type as ProviderType | undefined) ?? "linode";
        const providerName =
          typeof i.provider_name === "string" && i.provider_name.trim().length > 0
            ? i.provider_name
            : typeof i.providerName === "string" && i.providerName.trim().length > 0
            ? i.providerName
            : null;
        const providerId = typeof i.provider_id === "string" ? i.provider_id : null;
        const planForType = linodeTypes.find(
          (t) => t.id === (i.configuration?.type || "")
        );
        const specs = apiSpecs
          ? {
              vcpus: Number(apiSpecs.vcpus || 0),
              memory: Number(apiSpecs.memory || 0),
              disk: Number(apiSpecs.disk || 0),
              transfer: Number(apiSpecs.transfer || 0),
            }
          : planForType
          ? {
              vcpus: planForType.vcpus,
              memory: planForType.memory,
              disk: planForType.disk,
              transfer: planForType.transfer,
            }
          : { vcpus: 0, memory: 0, disk: 0, transfer: 0 };
        const pricing = apiPricing
          ? {
              hourly: Number(apiPricing.hourly || 0),
              monthly: Number(apiPricing.monthly || 0),
            }
          : planForType
          ? {
              hourly: planForType.price.hourly,
              monthly: planForType.price.monthly,
            }
          : { hourly: 0, monthly: 0 };
        const rawProgress =
          i &&
          typeof i.provider_progress === "object" &&
          i.provider_progress !== null
            ? i.provider_progress
            : null;
        const percentFromEvent = rawProgress
          ? clampPercent(rawProgress.percent)
          : null;
        const percentFromRow = clampPercent(i?.progress_percent);
        const progress =
          rawProgress || percentFromRow !== null
            ? {
                percent: percentFromEvent ?? percentFromRow,
                action: rawProgress?.action ?? null,
                status: rawProgress?.status ?? null,
                message: rawProgress?.message ?? null,
                created: rawProgress?.created ?? null,
              }
            : undefined;
        // Normalize status: treat provider 'offline' as 'stopped' for UI/actions
        const normalizedStatus =
          ((i.status as any) || "provisioning") === "offline"
            ? "stopped"
            : (i.status as any) || "provisioning";
        const instance: VPSInstance = {
          id: String(i.id),
          label: i.label,
          status: normalizedStatus,
          type: i.configuration?.type || "",
          region: i.configuration?.region || "",
          regionLabel: i.region_label || undefined,
          image: i.configuration?.image || "",
          ipv4: i.ip_address ? [i.ip_address] : [],
          ipv6: "",
          created: i.created_at,
          provider_id: providerId,
          provider_type: providerType,
          providerName,
          specs,
          stats: {
            cpu: 0,
            memory: 0,
            disk: 0,
            network: { in: 0, out: 0 },
            uptime: "",
          },
          pricing,
          progress: progress ?? undefined,
        };
        return instance;
      });

      setInstances(mapped);
    } catch (error: any) {
      console.error("Failed to load VPS instances:", error);
      toast.error(error.message || "Failed to load VPS instances");
    } finally {
      setLoading(false);
    }
  }, [token, linodeTypes]);

  useEffect(() => {
    loadVPSPlans();
  }, [loadVPSPlans]);

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  // Restore provider filter from session storage on mount
  useEffect(() => {
    const savedProviderFilter = sessionStorage.getItem("vps-provider-filter");
    if (savedProviderFilter) {
      setProviderFilter(savedProviderFilter);
    }
  }, []);

  // Simple polling: refresh instances while any are provisioning or rebooting
  useEffect(() => {
    const hasPending = instances.some(
      (i) => i.status === "provisioning" || i.status === "rebooting"
    );
    if (!hasPending) return;
    const interval = setInterval(() => {
      loadInstances();
    }, 10000);
    return () => clearInterval(interval);
  }, [instances, loadInstances]);

  // Calculate active steps based on provider and marketplace selection
  useEffect(() => {
    const hasMarketplaceApp = Boolean(
      createForm.provider_type === "digitalocean" &&
        (createForm.appSlug || (selectedStackScript as any)?.isMarketplace)
    );

    const steps = getActiveSteps({
      providerType: createForm.provider_type,
      hasMarketplaceApp,
      formData: createForm,
    });

    setActiveSteps(steps);
  }, [
    createForm.provider_type,
    createForm.appSlug,
    selectedStackScript,
    createForm,
  ]);

  // Load images and stack scripts when create modal opens
  useEffect(() => {
    if (showCreateModal) {
      loadLinodeImages();
      loadLinodeStackScripts();
      setModalOpen(true);

      // Fetch organization name and generate unique label
      (async () => {
        try {
          const org = await getOrganization();
          const companyName = org?.name || "vps";
          _setOrganizationName(companyName);

          // Generate unique label
          const existingLabels = instances.map((i) => i.label);
          const uniqueLabel = generateUniqueVPSLabel(
            companyName,
            existingLabels
          );
          setCreateForm({ label: uniqueLabel });
        } catch (error) {
          console.error(
            "Failed to fetch organization or generate label:",
            error
          );
          // Fallback: generate label with default name
          const existingLabels = instances.map((i) => i.label);
          const uniqueLabel = generateUniqueVPSLabel("vps", existingLabels);
          setCreateForm({ label: uniqueLabel });
        }
      })();

      // Preload critical assets for better UX
      // Protected API endpoints require auth headers, so skip preload hints here to avoid 401s.
    } else {
      setModalOpen(false);
    }
  }, [
    showCreateModal,
    loadLinodeImages,
    loadLinodeStackScripts,
    setModalOpen,
    isSlowConnection,
    preloadAsset,
    getOrganization,
    instances,
    setCreateForm,
  ]);

  // Performance measurement cleanup - run once on mount
  useEffect(() => {
    const cleanup = endRenderMeasurement;
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInstanceAction = async (
    instanceId: string,
    action: "boot" | "shutdown" | "reboot" | "delete"
  ) => {
    try {
      if (action === "delete") {
        const inst = instances.find((i) => i.id === instanceId);
        setDeleteModal({
          open: true,
          id: instanceId,
          label: inst?.label || "",
          input: "",
          password: "",
          confirmCheckbox: false,
          loading: false,
          error: "",
        });
        return;
      }
      let url = `/api/vps/${instanceId}`;
      const method: "POST" | "DELETE" = "POST";
      if (action === "boot") url += "/boot";
      else if (action === "shutdown") url += "/shutdown";
      else if (action === "reboot") url += "/reboot";

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data.error || `Failed to ${action} instance`);

      // Refresh from server for accurate status/IP sync
      await loadInstances();
      toast.success(`Instance ${action} initiated successfully`);
    } catch (error: any) {
      console.error(`Failed to ${action} instance:`, error);
      toast.error(error.message || `Failed to ${action} instance`);
    }
  };

  const handleBulkAction = async (
    action: "boot" | "shutdown" | "reboot" | "delete"
  ) => {
    if (selectedInstances.length === 0) return;

    // For delete action, show modal instead of window.confirm
    if (action === "delete") {
      setShowBulkDeleteModal(true);
      return;
    }

    // For restart action, show confirmation dialog
    if (action === "reboot") {
      const confirmed = window.confirm(
        `Are you sure you want to restart ${selectedInstances.length} instance${
          selectedInstances.length > 1 ? "s" : ""
        }?\n\n` +
          `The following instances will be restarted:\n` +
          selectedInstances.map((instance) => `• ${instance.label}`).join("\n")
      );
      if (!confirmed) return;
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each instance
    for (const instance of selectedInstances) {
      try {
        // Skip if action doesn't make sense for current status
        if (action === "boot" && instance.status === "running") continue;
        if (action === "shutdown" && instance.status === "stopped") continue;
        if (action === "reboot" && instance.status !== "running") continue;

        let url = `/api/vps/${instance.id}`;
        let method: "POST" | "DELETE" = "POST";

        if (action === "boot") url += "/boot";
        else if (action === "shutdown") url += "/shutdown";
        else if (action === "reboot") url += "/reboot";
        else if (action === "delete") method = "DELETE";

        const res = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(
            data.error || `Failed to ${action} ${instance.label}`
          );

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${instance.label}: ${error.message}`);
        console.error(`Failed to ${action} instance ${instance.label}:`, error);
      }
    }

    // Clear selection
    setSelectedInstances([]);
    setSelectedRowSelection({});

    // Refresh instances
    await loadInstances();

    // Show results
    if (results.success > 0 && results.failed === 0) {
      toast.success(
        `Successfully ${
          action === "boot"
            ? "started"
            : action === "shutdown"
            ? "stopped"
            : action === "reboot"
            ? "restarted"
            : "deleted"
        } ${results.success} instance${results.success > 1 ? "s" : ""}`
      );
    } else if (results.success > 0 && results.failed > 0) {
      toast.warning(
        `${results.success} instance${results.success > 1 ? "s" : ""} ${
          action === "boot"
            ? "started"
            : action === "shutdown"
            ? "stopped"
            : action === "reboot"
            ? "restarted"
            : "deleted"
        } successfully, ${results.failed} failed`
      );
    } else if (results.failed > 0) {
      toast.error(
        `Failed to ${action} ${results.failed} instance${
          results.failed > 1 ? "s" : ""
        }${results.errors.length > 0 ? ":\n" + results.errors.join("\n") : ""}`
      );
    }
  };

  const handleBulkDelete = async (password: string) => {
    if (selectedInstances.length === 0) return;

    setBulkDeleteLoading(true);

    try {
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      // Process each instance
      for (const instance of selectedInstances) {
        try {
          const res = await fetch(`/api/vps/${instance.id}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ password }),
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok)
            throw new Error(data.error || `Failed to delete ${instance.label}`);

          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(`${instance.label}: ${error.message}`);
          console.error(`Failed to delete instance ${instance.label}:`, error);
        }
      }

      // Clear selection and close modal
      setSelectedInstances([]);
      setSelectedRowSelection({});
      setShowBulkDeleteModal(false);

      // Refresh instances
      await loadInstances();

      // Show results
      if (results.success > 0 && results.failed === 0) {
        toast.success(
          `Successfully deleted ${results.success} instance${
            results.success > 1 ? "s" : ""
          }`
        );
      } else if (results.success > 0 && results.failed > 0) {
        toast.warning(
          `${results.success} instance${
            results.success > 1 ? "s" : ""
          } deleted successfully, ${results.failed} failed`
        );
      } else if (results.failed > 0) {
        toast.error(
          `Failed to delete ${results.failed} instance${
            results.failed > 1 ? "s" : ""
          }${
            results.errors.length > 0 ? ":\n" + results.errors.join("\n") : ""
          }`
        );
      }
    } catch (error: any) {
      console.error("Bulk delete failed:", error);
      throw error; // Re-throw to let modal handle the error
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy to clipboard");
    }
  };

  const confirmDeleteInstance = async () => {
    try {
      if (deleteModal.input.trim() !== deleteModal.label.trim()) {
        setDeleteModal((m) => ({
          ...m,
          error: "Name does not match. Type the exact server name.",
        }));
        return;
      }

      if (!deleteModal.password.trim()) {
        setDeleteModal((m) => ({
          ...m,
          error: "Please enter your account password.",
        }));
        return;
      }

      if (!deleteModal.confirmCheckbox) {
        setDeleteModal((m) => ({
          ...m,
          error: "Please confirm deletion by checking the checkbox.",
        }));
        return;
      }

      setDeleteModal((m) => ({ ...m, loading: true, error: "" }));

      const res = await fetch(`/api/vps/${deleteModal.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: deleteModal.password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete instance");
      setDeleteModal({
        open: false,
        id: "",
        label: "",
        input: "",
        password: "",
        confirmCheckbox: false,
        loading: false,
        error: "",
      });
      await loadInstances();
      toast.success("Instance deleted");
    } catch (err: any) {
      setDeleteModal((m) => ({
        ...m,
        loading: false,
        error: err.message || "Failed to delete instance",
      }));
      console.error("Delete instance error:", err);
    }
  };

  const handleCreateInstance = async () => {
    if (!createForm.provider_id || !createForm.provider_type) {
      mobileToast.error("Please select a provider");
      return;
    }

    if (!createForm.label || !createForm.rootPassword) {
      mobileToast.error("Label and root password are required");
      return;
    }

    if (!createForm.type) {
      mobileToast.error("Please select a plan");
      return;
    }

    if (!createForm.region) {
      mobileToast.error(
        "Region is required. Please select a plan with a configured region."
      );
      return;
    }

    // Calculate total cost including backups
    const selectedType = linodeTypes.find((t) => t.id === createForm.type);
    if (!selectedType) {
      mobileToast.error("Selected plan not found");
      return;
    }

    // Fetch plan details for backup pricing
    let backupCostHourly = 0;
    if (createForm.backups && createForm.backup_frequency && createForm.backup_frequency !== 'none') {
      try {
        const planRes = await fetch("/api/vps/plans", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const planData = await planRes.json();
        const plan = (planData.plans || []).find((p: any) => p.id === createForm.type);
        
        if (plan) {
          const baseBackupHourly = plan.backup_price_hourly || 0;
          const backupUpchargeHourly = plan.backup_upcharge_hourly || 0;
          const dailyMultiplier = createForm.backup_frequency === 'daily' ? 1.5 : 1;
          backupCostHourly = (baseBackupHourly + backupUpchargeHourly) * dailyMultiplier;
        }
      } catch (err) {
        console.error("Failed to fetch backup pricing:", err);
        // Continue with 0 backup cost if fetch fails
      }
    }

    const totalHourlyCost = selectedType.price.hourly + backupCostHourly;

    // Show mobile loading state
    mobileLoading.showLoading(
      "Verifying wallet balance...",
      "Please wait while we check your account balance"
    );

    // Check wallet balance
    try {
      const walletBalance = await paymentService.getWalletBalance();
      if (!walletBalance || walletBalance.balance < totalHourlyCost) {
        mobileLoading.hideLoading();
        mobileToast.error(
          `Insufficient wallet balance. Required: $${totalHourlyCost.toFixed(
            4
          )}/hour, Available: $${walletBalance?.balance.toFixed(2) || "0.00"}`,
          {
            duration: 8000, // Longer duration for important financial information
          }
        );
        return;
      }
    } catch (error) {
      console.error("Failed to check wallet balance:", error);
      mobileLoading.hideLoading();
      mobileToast.error("Failed to verify wallet balance. Please try again.");
      return;
    }

    try {
      // Enforce image compatibility and validate fields for Marketplace/StackScript
      if (selectedStackScript && Array.isArray(selectedStackScript.images)) {
        const allowed = selectedStackScript.images as string[];
        const knownIds = new Set((linodeImages || []).map((i: any) => i.id));
        const allowedKnown = allowed.filter((id) => knownIds.has(id));
        // If the script is unrestricted (any/all), skip strict enforcement
        if (allowedKnown.length > 0) {
          if (!createForm.image || !allowedKnown.includes(createForm.image)) {
            mobileLoading.hideLoading();
            mobileToast.error(
              "Selected OS image is not compatible with the selected application. Choose an allowed image."
            );
            return;
          }
        }
      }
      if (
        selectedStackScript &&
        Array.isArray(selectedStackScript.user_defined_fields)
      ) {
        const missing = (selectedStackScript.user_defined_fields || []).filter(
          (f: any) => {
            const val = stackscriptData[f.name];
            return (
              val === undefined || val === null || String(val).trim() === ""
            );
          }
        );
        if (missing.length > 0) {
          const first = missing[0];
          mobileLoading.hideLoading();
          mobileToast.error(
            `Please fill required field: ${first.label || first.name}`
          );
          return;
        }
      }

      // Build request body supporting Marketplace apps
      const isMarketplace = Boolean(
        (selectedStackScript as any)?.isMarketplace
      );
      
      // For DigitalOcean marketplace apps, use the app slug as the image parameter
      const imageToUse = isMarketplace && createForm.provider_type === 'digitalocean' && (selectedStackScript as any)?.appSlug
        ? (selectedStackScript as any).appSlug
        : createForm.image;
      
      const body: any = {
        provider_id: createForm.provider_id,
        provider_type: createForm.provider_type,
        label: createForm.label,
        type: createForm.type,
        region: createForm.region,
        image: imageToUse,
        rootPassword: createForm.rootPassword,
        sshKeys: createForm.sshKeys,
        backups: createForm.backups,
        backup_frequency: createForm.backup_frequency || (createForm.backups ? 'weekly' : 'none'),
        privateIP: createForm.privateIP,
      };
      
      // For Linode marketplace apps, still use appSlug field
      if (isMarketplace && createForm.provider_type === 'linode') {
        body.appSlug = (selectedStackScript as any)?.appSlug;
        body.appData = stackscriptData;
      } else if (!isMarketplace) {
        // For regular StackScripts (non-marketplace)
        body.stackscriptId = selectedStackScript?.id || undefined;
        body.stackscriptData = selectedStackScript
          ? stackscriptData
          : undefined;
      }

      // Update loading state for VPS creation
      mobileLoading.updateProgress(25, "Creating VPS instance...");

      const res = await fetch("/api/vps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      mobileLoading.updateProgress(75, "Processing response...");

      const payload = await res.json();
      if (!res.ok) {
        mobileLoading.hideLoading();
        // Handle specific error codes with better user feedback
        if (payload.code === "INSUFFICIENT_BALANCE") {
          mobileToast.error(
            `Insufficient wallet balance. You need $${
              payload.required?.toFixed(4) || "unknown"
            } but only have $${
              payload.available?.toFixed(2) || "unknown"
            }. Please add funds to your wallet.`,
            {
              duration: 8000,
            }
          );
        } else if (payload.code === "WALLET_NOT_FOUND") {
          mobileToast.error(
            "No wallet found for your organization. Please contact support."
          );
        } else if (payload.code === "WALLET_CHECK_FAILED") {
          mobileToast.error(
            "Failed to verify wallet balance. Please try again."
          );
        } else {
          mobileToast.error(payload.error || "Failed to create VPS");
        }
        return;
      }

      mobileLoading.updateProgress(100, "VPS created successfully!");

      // Brief delay to show completion before hiding loading
      setTimeout(() => {
        mobileLoading.hideLoading();
      }, 1000);

      // VPS creation successful - show appropriate message based on billing status
      if (payload.billing?.success) {
        mobileToast.success(
          `VPS "${createForm.label}" created successfully! ${payload.billing.message}`
        );
      } else {
        mobileToast.warning(
          `VPS "${createForm.label}" created successfully, but ${
            payload.billing?.message || "initial billing failed"
          }. You will be billed hourly as normal.`
        );
      }

      // Refresh list from server to reflect new instance
      await loadInstances();

      // Handle form submission (clears saved data)
      handleFormSubmit();

      setShowCreateModal(false);
      setCreateStep(1);
      setSelectedStackScript(null);
      setStackscriptData({});
    } catch (error) {
      console.error("Failed to create VPS instance:", error);
      mobileLoading.hideLoading();
      mobileToast.error("Failed to create VPS instance");
    }
  };

  const filteredInstances = instances.filter((instance) => {
    const matchesSearch =
      instance.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instance.ipv4[0].includes(searchTerm);
    const matchesStatus =
      statusFilter === "all" || instance.status === statusFilter;
    const matchesRegion =
      regionFilter === "all" || instance.region === regionFilter;
    const matchesProvider =
      providerFilter === "all" ||
      (instance.provider_type || "linode") === providerFilter;
    return matchesSearch && matchesStatus && matchesRegion && matchesProvider;
  });

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 GB";
    const gb = bytes / 1024;
    return `${gb.toFixed(0)} GB`;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Filter plans based on selected provider
  const filteredLinodeTypes = useMemo(() => {
    if (!createForm.provider_id) {
      return linodeTypes;
    }
    // Filter plans to only show those matching the selected provider
    // Also include plans without provider_id for backward compatibility
    return linodeTypes.filter(
      (plan) => !plan.provider_id || plan.provider_id === createForm.provider_id
    );
  }, [linodeTypes, createForm.provider_id]);

  // Multi-step modal helpers
  const totalSteps = activeSteps.length > 0 ? activeSteps.length : 4;
  const canProceed = useMemo(() => {
    if (createStep === 1)
      return Boolean(
        createForm.provider_id &&
          createForm.label &&
          createForm.type &&
          createForm.region // Region is now required
      );
    if (createStep === 3) return Boolean(createForm.image);
    return true;
  }, [
    createStep,
    createForm.provider_id,
    createForm.label,
    createForm.type,
    createForm.region,
    createForm.image,
  ]);

  const handleNext = () => {
    const nextStep = getNextStep(createStep, activeSteps);
    if (nextStep !== null) {
      setCreateStep(nextStep);
    }
  };

  const handleBack = () => {
    const prevStep = getPreviousStep(createStep, activeSteps);
    if (prevStep !== null) {
      setCreateStep(prevStep);
    }
  };

  // Get dynamic step information from active steps configuration
  const getStepInfo = (originalStepNumber: number) => {
    const stepConfig = activeSteps.find(
      (s) => s.originalStepNumber === originalStepNumber
    );
    return stepConfig || null;
  };

  const creationSteps = [
    {
      id: "plan",
      title: getStepInfo(1)?.title || "Plan & Label",
      description:
        getStepInfo(1)?.description ||
        "Configure the server label and pricing plan before provisioning.",
      content: (
        <div className="space-y-4">
          <div className="space-y-4">
            <ProviderSelector
              value={createForm.provider_id}
              onChange={(providerId: string, providerType: ProviderType) => {
                // Clear marketplace app selection when switching away from DigitalOcean
                const updates: Partial<CreateVPSForm> = {
                  provider_id: providerId,
                  provider_type: providerType,
                  type: "", // Reset plan selection when provider changes
                  region: "", // Reset region when provider changes
                };

                // Clear marketplace app when switching away from DigitalOcean
                if (providerType !== "digitalocean") {
                  updates.appSlug = undefined;
                  updates.appData = undefined;
                }

                setCreateForm(updates);

                // Reset to step 1 when provider changes
                setCreateStep(1);
              }}
              disabled={false}
              token={token || ""}
            />

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Label *{" "}
                <span className="text-xs text-muted-foreground/70">
                  (auto-generated)
                </span>
              </label>
              <input
                type="text"
                value={createForm.label}
                readOnly
                disabled
                className="w-full px-4 py-3 min-h-[48px] border border-rounded-md bg-muted text-muted-foreground placeholder-gray-500 dark:placeholder-gray-400 cursor-not-allowed text-base"
                placeholder="Generating unique label..."
              />
              <p className="mt-1 text-xs text-muted-foreground">
                A unique server name is automatically generated for you
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Plan
              </label>
              <select
                value={createForm.type}
                onChange={(e) => {
                  const newType = e.target.value;
                  // Don't auto-select region anymore - user will select it separately
                  setCreateForm({
                    type: newType,
                    region: "", // Clear region when plan changes
                  });
                }}
                className="w-full px-4 py-3 min-h-[48px] border border-rounded-md bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-base"
              >
                <option value="">Click to choose plan</option>
                {filteredLinodeTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>

              {createForm.type &&
                (() => {
                  const selectedType = linodeTypes.find(
                    (t) => t.id === createForm.type
                  );
                  if (!selectedType) return null;
                  return (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        <Cpu className="h-3.5 w-3.5 mr-1" />
                        {selectedType.vcpus} vCPU
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <MemoryStick className="h-3.5 w-3.5 mr-1" />
                        {formatBytes(selectedType.memory)} RAM
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <HardDrive className="h-3.5 w-3.5 mr-1" />
                        {Math.round(selectedType.disk / 1024)} GB Storage
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Network className="h-3.5 w-3.5 mr-1" />
                        {selectedType.transfer} GB Transfer
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <DollarSign className="h-3.5 w-3.5 mr-1" />
                        {formatCurrency(selectedType.price.monthly)} / mo
                      </Badge>
                    </div>
                  );
                })()}
            </div>

            {/* Region Selection */}
            {createForm.provider_id && createForm.type && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Region *
                </label>
                <p className="text-sm text-muted-foreground mb-3">
                  Select the datacenter location for your VPS
                </p>
                <RegionSelector
                  providerType={createForm.provider_type}
                  providerId={createForm.provider_id}
                  selectedRegion={createForm.region}
                  onSelect={(regionId) => setCreateForm({ region: regionId })}
                  token={token || ""}
                />
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "deployments",
      title:
        getStepInfo(2)?.title ||
        (createForm.provider_type === "digitalocean"
          ? "Marketplace Apps"
          : "1-Click Deployments"),
      description:
        getStepInfo(2)?.description ||
        (createForm.provider_type === "digitalocean"
          ? "Optionally deploy a pre-configured application."
          : "Optionally provision with a StackScript or continue without one."),
      content: (
        <CreateVPSSteps
          step={2}
          providerType={createForm.provider_type}
          formData={createForm}
          onFormChange={setCreateForm}
          token={token || ""}
          linodeStackScripts={linodeStackScripts}
          selectedStackScript={selectedStackScript}
          onStackScriptSelect={setSelectedStackScript}
          stackscriptData={stackscriptData}
          onStackScriptDataChange={setStackscriptData}
          allowedImagesDisplay={allowedImagesDisplay}
        />
      ),
    },
    {
      id: "os",
      title: getStepInfo(3)?.title || "Operating System",
      description:
        getStepInfo(3)?.description ||
        "Pick the base operating system for this VPS.",
      content: (
        <CreateVPSSteps
          step={3}
          providerType={createForm.provider_type}
          formData={createForm}
          onFormChange={setCreateForm}
          token={token || ""}
          effectiveOsGroups={effectiveOsGroups}
          selectedOSGroup={selectedOSGroup}
          onOSGroupSelect={setSelectedOSGroup}
          selectedOSVersion={selectedOSVersion}
          onOSVersionSelect={(key, version) =>
            setSelectedOSVersion((prev) => ({ ...prev, [key]: version }))
          }
          osTab={osTab}
          onOsTabChange={setOsTab}
        />
      ),
    },
    {
      id: "finalize",
      title: getStepInfo(4)?.title || "Finalize & Review",
      description:
        getStepInfo(4)?.description ||
        "Set credentials and optional add-ons before provisioning.",
      content: (
        <CreateVPSSteps
          step={4}
          providerType={createForm.provider_type}
          formData={createForm}
          onFormChange={setCreateForm}
          token={token || ""}
        />
      ),
    },
  ];

  const stackFooter = (
    <div className="flex items-center justify-between">
      <button
        onClick={() => {
          if (isFormDirty) {
            const shouldSave = window.confirm(
              "You have unsaved changes. Would you like to save your progress?"
            );
            if (shouldSave) {
              saveForm();
            }
          }
          setShowCreateModal(false);
          setCreateStep(1);
        }}
        className="px-6 py-3 min-h-[48px] border border-rounded-md text-sm font-medium text-muted-foreground bg-secondary hover:bg-secondary/80 active:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary touch-manipulation transition-colors duration-200"
        aria-label="Cancel VPS creation"
      >
        Cancel
      </button>
      <div className="flex items-center space-x-3">
        {createStep > 1 && (
          <Button onClick={handleBack} variant="secondary">
            Back
          </Button>
        )}
        {createStep < totalSteps && (
          <Button
            onClick={handleNext}
            disabled={!canProceed}
            variant={canProceed ? "default" : "secondary"}
          >
            Next
          </Button>
        )}
        {createStep === totalSteps && (
          <Button onClick={handleCreateInstance} variant="default">
            Create VPS
          </Button>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading VPS instances...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mobile loading overlay */}
      <MobileLoading
        isLoading={mobileLoading.isLoading}
        title={mobileLoading.title}
        description={mobileLoading.description}
        progress={mobileLoading.progress}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                VPS Management
              </h1>
              <p className="mt-2 text-muted-foreground">
                Manage your VPS instances and monitor their performance
              </p>
            </div>
            <MobileLoadingButton
              onClick={() => {
                setCreateStep(1);
                setShowCreateModal(true);
              }}
              className="inline-flex flex-row items-center justify-center gap-2 whitespace-nowrap px-4 py-2 sm:py-3 min-h-[44px] sm:min-h-[48px] border border-transparent text-sm font-medium rounded-lg shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 active:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary w-auto touch-manipulation transition-colors duration-200"
              isLoading={false}
              aria-label="Create new VPS instance"
            >
              <Plus className="h-4 w-4 self-center flex-shrink-0" />
              <span className="font-medium leading-none">Create VPS</span>
            </MobileLoadingButton>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Search Row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="relative flex-1 max-w-md w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground " />
                  <input
                    type="text"
                    placeholder="Search instances..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 min-h-[48px] border border-rounded-md bg-secondary text-foreground placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-base touch-manipulation"
                    aria-label="Search VPS instances"
                  />
                </div>
                <button
                  onClick={loadInstances}
                  className="inline-flex w-full sm:w-auto items-center justify-center px-4 py-3 min-h-[48px] border border shadow-sm text-sm font-medium rounded-md text-muted-foreground bg-secondary hover:bg-secondary/80 active:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary touch-manipulation transition-colors duration-200"
                  aria-label="Refresh VPS instances list"
                >
                  <RefreshCw className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Filters Row */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-4 py-3 min-h-[48px] border border-rounded-md bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-base touch-manipulation"
                      aria-label="Filter by VPS status"
                    >
                      <option value="all">All Status</option>
                      <option value="running">Running</option>
                      <option value="stopped">Stopped</option>
                      <option value="provisioning">Provisioning</option>
                      <option value="rebooting">Rebooting</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Region
                    </label>
                    <select
                      value={regionFilter}
                      onChange={(e) => setRegionFilter(e.target.value)}
                      className="w-full px-4 py-3 min-h-[48px] border border-rounded-md bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-base touch-manipulation"
                      aria-label="Filter by VPS region"
                    >
                      <option value="all">All Regions</option>
                      {allowedRegions.map((region) => (
                        <option key={region.id} value={region.id}>
                          {region.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Provider
                    </label>
                    <select
                      value={providerFilter}
                      onChange={(e) => {
                        setProviderFilter(e.target.value);
                        // Persist filter selection in session storage
                        sessionStorage.setItem(
                          "vps-provider-filter",
                          e.target.value
                        );
                      }}
                      className="w-full px-4 py-3 min-h-[48px] border border-rounded-md bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-base touch-manipulation"
                      aria-label="Filter by provider"
                    >
                      <option value="all">All Providers</option>
                      <option value="linode">Linode</option>
                      <option value="digitalocean">DigitalOcean</option>
                      <option value="aws">AWS</option>
                      <option value="gcp">GCP</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* VPS Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Power className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Running
                  </p>
                  <p className="text-2xl font-bold">
                    {instances.filter((i) => i.status === "running").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-secondary rounded-lg">
                  <PowerOff className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Stopped
                  </p>
                  <p className="text-2xl font-bold">
                    {instances.filter((i) => i.status === "stopped").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
                  <Server className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total
                  </p>
                  <p className="text-2xl font-bold">{instances.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Monthly Cost
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(
                      instances.reduce((sum, i) => sum + i.pricing.monthly, 0)
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedInstances.length > 0 && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {selectedInstances.length} instance
                    {selectedInstances.length > 1 ? "s" : ""} selected
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-2">
                  <Button
                    onClick={() => handleBulkAction("boot")}
                    variant="secondary"
                    size="sm"
                    className="text-green-700 bg-green-100 border-green-300 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/30 min-h-[44px] touch-manipulation flex-1 sm:flex-none"
                    disabled={selectedInstances.every(
                      (instance) => instance.status === "running"
                    )}
                  >
                    <Power className="h-4 w-4 mr-1" />
                    <span className="hidden xs:inline">Start</span>
                    <span className="xs:hidden">▶️</span>
                  </Button>
                  <Button
                    onClick={() => handleBulkAction("shutdown")}
                    variant="secondary"
                    size="sm"
                    className="text-orange-700 bg-orange-100 border-orange-300 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-900/30 min-h-[44px] touch-manipulation flex-1 sm:flex-none"
                    disabled={selectedInstances.every(
                      (instance) => instance.status === "stopped"
                    )}
                  >
                    <PowerOff className="h-4 w-4 mr-1" />
                    <span className="hidden xs:inline">Stop</span>
                    <span className="xs:hidden">⏹️</span>
                  </Button>
                  <Button
                    onClick={() => handleBulkAction("reboot")}
                    variant="default"
                    size="sm"
                    className="min-h-[44px] touch-manipulation flex-1 sm:flex-none"
                    disabled={selectedInstances.every(
                      (instance) => instance.status !== "running"
                    )}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    <span className="hidden xs:inline">Restart</span>
                    <span className="xs:hidden">🔄</span>
                  </Button>
                  <Button
                    onClick={() => handleBulkAction("delete")}
                    variant="destructive"
                    size="sm"
                    className="min-h-[44px] touch-manipulation flex-1 sm:flex-none"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    <span className="hidden xs:inline">Delete</span>
                    <span className="xs:hidden">🗑️</span>
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedInstances([]);
                      setSelectedRowSelection({});
                    }}
                    variant="outline"
                    size="sm"
                    className="min-h-[44px] touch-manipulation w-full sm:w-auto mt-2 sm:mt-0"
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* VPS List */}
        <Card>
          <CardHeader>
            <CardTitle>VPS Instances ({filteredInstances.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <VpsInstancesTable
              instances={filteredInstances}
              allowedRegions={allowedRegions}
              onAction={handleInstanceAction}
              onCopy={copyToClipboard}
              onSelectionChange={setSelectedInstances}
              rowSelection={selectedRowSelection}
              onRowSelectionChange={setSelectedRowSelection}
              isLoading={loading && instances.length > 0}
            />
          </CardContent>
        </Card>

        <DialogStack
          open={showCreateModal}
          onOpenChange={(isOpen) => {
            if (!isOpen && isFormDirty) {
              const shouldSave = window.confirm(
                "You have unsaved changes. Would you like to save your progress?"
              );
              if (shouldSave) {
                saveForm();
              }
            }
            setShowCreateModal(isOpen);
            if (!isOpen) setCreateStep(1);
          }}
          steps={creationSteps.filter((step) => {
            // Filter steps based on active steps configuration
            const stepNumber =
              step.id === "plan"
                ? 1
                : step.id === "deployments"
                ? 2
                : step.id === "os"
                ? 3
                : 4;
            return activeSteps.some((s) => s.originalStepNumber === stepNumber);
          })}
          activeStep={
            activeSteps.findIndex((s) => s.originalStepNumber === createStep)
          }
          onStepChange={(index) => {
            const step = activeSteps[index];
            if (step) {
              setCreateStep(step.originalStepNumber);
            }
          }}
          title="Create New VPS Instance"
          description={
            lastSaved
              ? `Provision a VPS using our guided setup. Auto-saved ${new Date(
                  lastSaved
                ).toLocaleTimeString()}`
              : "Provision a VPS using our guided setup."
          }
          footer={stackFooter}
          mobileLayout={
            optimizedSettings.enableAnimations ? "adaptive" : "fullscreen"
          }
          touchOptimized={true}
        />

        {deleteModal.open && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 bg-background dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border w-full max-w-lg shadow-lg rounded-md bg-card">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-foreground mb-4">
                  Confirm Delete
                </h3>
                <p className="text-sm text-gray-600 text-muted-foreground">
                  To confirm deletion, type the server name exactly:
                </p>
                <div className="mt-2 flex items-center space-x-2">
                  <p className="text-sm font-mono px-2 py-1 bg-secondary text-foreground rounded">
                    {deleteModal.label}
                  </p>
                  <button
                    onClick={() => copyToClipboard(deleteModal.label)}
                    className="p-3 min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground active:text-foreground focus:outline-none focus:ring-2 focus:ring-primary rounded-md touch-manipulation transition-colors duration-200"
                    title="Copy server name"
                    aria-label="Copy server name to clipboard"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Server name
                    </label>
                    <input
                      type="text"
                      value={deleteModal.input}
                      onChange={(e) =>
                        setDeleteModal((m) => ({
                          ...m,
                          input: e.target.value,
                          error: "",
                        }))
                      }
                      placeholder="Type the server name to confirm"
                      className="w-full px-4 py-3 min-h-[48px] border border-rounded-md bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-red-500 text-base touch-manipulation"
                      autoComplete="off"
                      aria-label="Confirm server name for deletion"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Account Password
                    </label>
                    <input
                      type="password"
                      value={deleteModal.password}
                      onChange={(e) =>
                        setDeleteModal((m) => ({
                          ...m,
                          password: e.target.value,
                          error: "",
                        }))
                      }
                      placeholder="Enter your account password"
                      className="w-full px-4 py-3 min-h-[48px] border border-rounded-md bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-red-500 text-base touch-manipulation"
                      autoComplete="current-password"
                      aria-label="Enter account password to confirm deletion"
                    />
                  </div>
                </form>

                <div className="mt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={deleteModal.confirmCheckbox}
                      onChange={(e) =>
                        setDeleteModal((m) => ({
                          ...m,
                          confirmCheckbox: e.target.checked,
                          error: "",
                        }))
                      }
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border rounded"
                    />
                    <span className="ml-2 text-sm text-muted-foreground">
                      I understand that this action cannot be undone and will
                      permanently delete the VPS and all its data.
                    </span>
                  </label>
                  {deleteModal.error && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                      {deleteModal.error}
                    </p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
                  <button
                    onClick={() =>
                      setDeleteModal({
                        open: false,
                        id: "",
                        label: "",
                        input: "",
                        password: "",
                        confirmCheckbox: false,
                        loading: false,
                        error: "",
                      })
                    }
                    className="px-6 py-3 min-h-[48px] border border-rounded-md text-sm font-medium text-muted-foreground bg-secondary hover:bg-secondary/80 active:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary touch-manipulation transition-colors duration-200"
                    disabled={deleteModal.loading}
                    aria-label="Cancel deletion"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteInstance}
                    disabled={
                      deleteModal.loading ||
                      deleteModal.input.trim() !== deleteModal.label.trim() ||
                      !deleteModal.password.trim() ||
                      !deleteModal.confirmCheckbox
                    }
                    className={`px-6 py-3 min-h-[48px] border border-transparent rounded-md shadow-sm text-sm font-medium text-white touch-manipulation transition-colors duration-200 ${
                      deleteModal.input.trim() === deleteModal.label.trim() &&
                      deleteModal.password.trim() &&
                      deleteModal.confirmCheckbox
                        ? "bg-red-600 hover:bg-red-700 active:bg-red-800"
                        : "bg-red-400 cursor-not-allowed"
                    }`}
                    aria-label="Confirm server deletion"
                  >
                    {deleteModal.loading ? "Deleting..." : "Delete Server"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Delete Modal */}
        <BulkDeleteModal
          isOpen={showBulkDeleteModal}
          onClose={() => setShowBulkDeleteModal(false)}
          onConfirm={handleBulkDelete}
          selectedInstances={selectedInstances}
          isLoading={bulkDeleteLoading}
        />
      </div>
    </div>
  );
};

export default VPS;
