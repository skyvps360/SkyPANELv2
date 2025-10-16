/**
 * VPS Management Page
 * Handles Linode VPS instance creation, management, and monitoring
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Server, 
  Plus, 
  Play, 
  Square, 
  Trash2, 
  Settings, 
  Terminal, 
  Eye,
  RefreshCw,
  Search,
  Filter,
  Monitor,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  MapPin,
  DollarSign,
  Clock,
  Power,
  PowerOff,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
// Navigation provided by AppLayout
import { useAuth } from '../contexts/AuthContext';
import { paymentService } from '../services/paymentService';

interface VPSInstance {
  id: string;
  label: string;
  status: 'running' | 'stopped' | 'provisioning' | 'rebooting' | 'error' | 'restoring' | 'backing_up';
  type: string;
  region: string;
  regionLabel?: string;
  image: string;
  ipv4: string[];
  ipv6: string;
  created: string;
  specs: {
    vcpus: number;
    memory: number;
    disk: number;
    transfer: number;
  };
  stats: {
    cpu: number;
    memory: number;
    disk: number;
    network: {
      in: number;
      out: number;
    };
    uptime: string;
  };
  pricing: {
    hourly: number;
    monthly: number;
  };
}

interface CreateVPSForm {
  label: string;
  type: string;
  region: string;
  image: string;
  rootPassword: string;
  sshKeys: string[];
  backups: boolean;
  privateIP: boolean;
}

interface LinodeType {
  id: string;
  label: string;
  disk: number;
  memory: number;
  vcpus: number;
  transfer: number;
  region?: string;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState<number>(1);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; label: string; input: string; password: string; confirmCheckbox: boolean; loading: boolean; error: string }>({ open: false, id: '', label: '', input: '', password: '', confirmCheckbox: false, loading: false, error: '' });
  const [selectedInstance, setSelectedInstance] = useState<VPSInstance | null>(null);
  const [createForm, setCreateForm] = useState<CreateVPSForm>({
    label: '',
    type: '',
    region: '',
    image: 'linode/ubuntu22.04',
    rootPassword: '',
    sshKeys: [],
    backups: false,
    privateIP: false
  });
  const { token } = useAuth();
  const [linodeTypes, setLinodeTypes] = useState<LinodeType[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [linodeImages, setLinodeImages] = useState<any[]>([]);
  const [linodeStackScripts, setLinodeStackScripts] = useState<any[]>([]);
  const [selectedStackScript, setSelectedStackScript] = useState<any | null>(null);
  const [stackscriptData, setStackscriptData] = useState<Record<string, any>>({});
  const [loadingStackScripts, setLoadingStackScripts] = useState<boolean>(false);
  // OS selection redesign: tabs, grouping, and per-OS version selection
  const [osTab, setOsTab] = useState<'templates' | 'iso'>('templates');
  const [selectedOSGroup, setSelectedOSGroup] = useState<string | null>(null);
  const [selectedOSVersion, setSelectedOSVersion] = useState<Record<string, string>>({});

  // Group Linode images into distributions with versions for cleaner selection cards
  const osGroups = useMemo(() => {
    const groups: Record<string, { name: string; key: string; versions: Array<{ id: string; label: string }> }> = {};
    const add = (key: string, name: string, id: string, label: string) => {
      if (!groups[key]) groups[key] = { key, name, versions: [] };
      groups[key].versions.push({ id, label });
    };
    (linodeImages || []).forEach((img: any) => {
      const id: string = img.id || '';
      const label: string = img.label || id;
      const lower = `${id} ${label}`.toLowerCase();
      // Exclude non-OS entries like Kubernetes/LKE from OS selection
      if (/(^|\s)(kubernetes|lke|k8s)(\s|$)/i.test(lower)) {
        return;
      }
      if (lower.includes('ubuntu')) add('ubuntu', 'Ubuntu', id, label);
      else if (lower.includes('centos')) add('centos', 'CentOS', id, label);
      else if (lower.includes('alma')) add('almalinux', 'AlmaLinux', id, label);
      else if (lower.includes('rocky')) add('rockylinux', 'Rocky Linux', id, label);
      else if (lower.includes('debian')) add('debian', 'Debian', id, label);
      else if (lower.includes('fedora')) add('fedora', 'Fedora', id, label);
      else if (lower.includes('alpine')) add('alpine', 'Alpine', id, label);
      else if (lower.includes('arch')) add('arch', 'Arch Linux', id, label);
      else if (lower.includes('opensuse')) add('opensuse', 'openSUSE', id, label);
      else if (lower.includes('gentoo')) add('gentoo', 'Gentoo', id, label);
      else if (lower.includes('slackware')) add('slackware', 'Slackware', id, label);
    });
    // Sort versions descending by numeric parts in label to prefer latest first
    Object.values(groups).forEach(g => {
      g.versions.sort((a, b) => b.label.localeCompare(a.label, undefined, { numeric: true }));
    });
    return groups;
  }, [linodeImages]);

  // Constrain visible OS versions when a WordPress StackScript specifies allowed base images
  const effectiveOsGroups = useMemo(() => {
    const allowed = Array.isArray(selectedStackScript?.images) ? (selectedStackScript!.images as string[]) : [];
    if (!selectedStackScript) return osGroups;
    const knownIds = new Set((linodeImages || []).map((i: any) => i.id));
    const allowedKnown = allowed.filter((id: string) => knownIds.has(id));
    // If the StackScript allows any/all (no specific known image IDs), show all OS groups
    if (allowed.length === 0 || allowedKnown.length === 0) return osGroups;
    const allowedSet = new Set(allowedKnown);
    const filtered: typeof osGroups = {} as any;
    Object.entries(osGroups).forEach(([key, group]) => {
      const versions = group.versions.filter(v => allowedSet.has(v.id));
      if (versions.length > 0) filtered[key] = { ...group, versions };
    });
    return filtered;
  }, [osGroups, selectedStackScript, linodeImages]);

  // Display helper for StackScript allowed images (falls back to Any Linux distribution)
  const allowedImagesDisplay = useMemo(() => {
    if (!selectedStackScript) return '';
    const allowed = Array.isArray(selectedStackScript.images) ? (selectedStackScript.images as string[]) : [];
    const byId = new Map((linodeImages || []).map((img: any) => [img.id, img.label || img.id]));
    const knownLabels = allowed.filter(id => byId.has(id)).map(id => String(byId.get(id)).replace(/^linode\//i, ''));
    if (allowed.length === 0 || knownLabels.length === 0) return 'Any Linux distribution';
    return knownLabels.join(', ');
  }, [selectedStackScript, linodeImages]);

  // Sync default selection to current form image when images load
  useEffect(() => {
    if (!linodeImages || linodeImages.length === 0) return;
    const current = linodeImages.find((i: any) => i.id === createForm.image);
    const src = `${createForm.image} ${(current?.label || '')}`.toLowerCase();
    const key = src.includes('ubuntu') ? 'ubuntu'
      : src.includes('centos') ? 'centos'
      : src.includes('alma') ? 'almalinux'
      : src.includes('rocky') ? 'rockylinux'
      : src.includes('debian') ? 'debian'
      : src.includes('fedora') ? 'fedora'
      : src.includes('alpine') ? 'alpine'
      : src.includes('arch') ? 'arch' : null;
    if (key) {
      setSelectedOSGroup(prev => prev || key);
      setSelectedOSVersion(prev => ({ ...prev, [key]: createForm.image }));
    }
  }, [linodeImages, createForm.image]);

  // Regions allowed by admin configuration: derive strictly from configured VPS plans
  const allowedRegions: LinodeRegion[] = useMemo(() => {
    const ids = Array.from(new Set((linodeTypes || [])
      .map(t => t.region)
      .filter((r): r is string => typeof r === 'string' && r.trim().length > 0)));
    return ids.map(id => ({ id, label: id, country: '' }));
  }, [linodeTypes]);

  const osImages = [
    { id: 'linode/ubuntu24.04', label: 'Ubuntu 24.04 LTS' },
    { id: 'linode/ubuntu22.04', label: 'Ubuntu 22.04 LTS' },
    { id: 'linode/ubuntu20.04', label: 'Ubuntu 20.04 LTS' },
    { id: 'linode/debian12', label: 'Debian 12' },
    { id: 'linode/debian11', label: 'Debian 11' },
    { id: 'linode/debian10', label: 'Debian 10' },
    { id: 'linode/centos-stream9', label: 'CentOS Stream 9' },
    { id: 'linode/centos-stream8', label: 'CentOS Stream 8' },
    { id: 'linode/rocky9', label: 'Rocky Linux 9' },
    { id: 'linode/rocky8', label: 'Rocky Linux 8' },
    { id: 'linode/almalinux9', label: 'AlmaLinux 9' },
    { id: 'linode/almalinux8', label: 'AlmaLinux 8' },
    { id: 'linode/fedora39', label: 'Fedora 39' },
    { id: 'linode/fedora38', label: 'Fedora 38' },
    { id: 'linode/alpine3.19', label: 'Alpine 3.19' },
    { id: 'linode/alpine3.18', label: 'Alpine 3.18' },
    { id: 'linode/arch', label: 'Arch Linux' },
    { id: 'linode/gentoo', label: 'Gentoo' },
    { id: 'linode/opensuse-leap15.5', label: 'openSUSE Leap 15.5' },
    { id: 'linode/slackware15.0', label: 'Slackware 15.0' }
  ];

  useEffect(() => {
    // Load plans first so instance mapping can derive specs and pricing
    (async () => {
      await loadVPSPlans();
      await loadInstances();
    })();
  }, []);

  // Simple polling: refresh instances while any are provisioning or rebooting
  useEffect(() => {
    const hasPending = instances.some(i => i.status === 'provisioning' || i.status === 'rebooting');
    if (!hasPending) return;
    const interval = setInterval(() => {
      loadInstances();
    }, 10000);
    return () => clearInterval(interval);
  }, [instances]);

  // Load images and stack scripts when create modal opens
  useEffect(() => {
    if (showCreateModal) {
      loadLinodeImages();
      loadLinodeStackScripts();
    }
  }, [showCreateModal]);

  // Initialize StackScript data defaults when a script is selected
  useEffect(() => {
    if (selectedStackScript && Array.isArray(selectedStackScript.user_defined_fields)) {
      const initial: Record<string, any> = {};
      selectedStackScript.user_defined_fields.forEach((f: any) => {
        if (f && typeof f.default !== 'undefined' && f.default !== null && String(f.default).length > 0) {
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
    const allowed = Array.isArray(selectedStackScript.images) ? (selectedStackScript.images as string[]) : [];
    const knownIds = new Set((linodeImages || []).map((i: any) => i.id));
    const allowedKnown = allowed.filter(id => knownIds.has(id));
    // If unrestricted (any/all), don't force-change the current image
    if (allowed.length === 0 || allowedKnown.length === 0) return;
    const current = createForm.image;
    const isAllowed = current && allowedKnown.includes(current);
    const pick = isAllowed ? current : allowedKnown[0];
    if (pick && pick !== current) {
      setCreateForm(prev => ({ ...prev, image: pick }));
      const src = pick.toLowerCase();
      const key = src.includes('ubuntu') ? 'ubuntu'
        : src.includes('centos') ? 'centos'
        : src.includes('alma') ? 'almalinux'
        : src.includes('rocky') ? 'rockylinux'
        : src.includes('debian') ? 'debian'
        : src.includes('fedora') ? 'fedora'
        : src.includes('alpine') ? 'alpine'
        : src.includes('arch') ? 'arch'
        : src.includes('opensuse') ? 'opensuse'
        : src.includes('gentoo') ? 'gentoo'
        : src.includes('slackware') ? 'slackware'
        : null;
      if (key) {
        setSelectedOSGroup(key);
        setSelectedOSVersion(prev => ({ ...prev, [key]: pick }));
      }
    }
  }, [selectedStackScript, linodeImages]);

  const loadVPSPlans = async () => {
    setLoadingPlans(true);
    try {
      const res = await fetch('/api/vps/plans', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load VPS plans');

      // Map admin plans to LinodeType format
      const mappedPlans: LinodeType[] = (payload.plans || []).map((plan: any) => {
        const specs = plan.specifications || {};
        const basePrice = Number(plan.base_price || 0);
        const markupPrice = Number(plan.markup_price || 0);
        const totalPrice = basePrice + markupPrice;

        // Normalize spec fields from various sources
        const disk =
          (typeof specs.disk === 'number' ? specs.disk : undefined) ??
          (typeof specs.storage_gb === 'number' ? specs.storage_gb : undefined) ??
          0;

        const memoryMb =
          (typeof specs.memory === 'number' ? specs.memory : undefined) ??
          (typeof specs.memory_gb === 'number' ? specs.memory_gb * 1024 : undefined) ??
          0;

        const vcpus =
          (typeof specs.vcpus === 'number' ? specs.vcpus : undefined) ??
          (typeof specs.cpu_cores === 'number' ? specs.cpu_cores : undefined) ??
          0;

        const transferGb =
          (typeof specs.transfer === 'number' ? specs.transfer : undefined) ??
          (typeof specs.transfer_gb === 'number' ? specs.transfer_gb : undefined) ??
          (typeof specs.bandwidth_gb === 'number' ? specs.bandwidth_gb : undefined) ??
          0;

        const region = plan.region_id || specs.region || '';

        return {
          id: String(plan.id),
          label: `${plan.name} - $${totalPrice.toFixed(2)}/mo`,
          disk: disk,
          memory: memoryMb,
          vcpus: vcpus,
          transfer: transferGb,
          region,
          price: {
            hourly: totalPrice / 730,
            monthly: totalPrice
          }
        };
      });

      setLinodeTypes(mappedPlans);
    } catch (error: any) {
      console.error('Failed to load VPS plans:', error);
      toast.error(error.message || 'Failed to load VPS plans');
    } finally {
      setLoadingPlans(false);
    }
  };

  const loadLinodeImages = async () => {
    try {
      const res = await fetch('/api/vps/images', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load images');
      setLinodeImages(payload.images || []);
    } catch (error: any) {
      console.error('Failed to load Linode images:', error);
      toast.error(error.message || 'Failed to load images');
    }
  };

  const loadLinodeStackScripts = async () => {
    setLoadingStackScripts(true);
    try {
      // Load admin-configured StackScripts for 1-Click deployments
      const res = await fetch('/api/vps/stackscripts?configured=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load stack scripts');

      const scripts = Array.isArray(payload.stackscripts) ? payload.stackscripts : [];
      setLinodeStackScripts(scripts);
      
      // Auto-select ssh-key script as default (but display as "None")
      const sshKeyScript = scripts.find(script => 
        script.label === 'ssh-key' || 
        script.id === 'ssh-key' ||
        (script.label && script.label.toLowerCase().includes('ssh'))
      );
      
      if (sshKeyScript) {
        setSelectedStackScript(sshKeyScript);
      }
    } catch (error: any) {
      console.error('Failed to load 1-Click deployments:', error);
      toast.error(error.message || 'Failed to load deployments');
    }
    finally {
      setLoadingStackScripts(false);
    }
  };

  const loadInstances = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vps', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load VPS instances');

      const mapped: VPSInstance[] = (payload.instances || []).map((i: any) => {
        // Prefer API-provided plan specs/pricing; fallback to loaded plans; else zeros
        const apiSpecs = i.plan_specs || null;
        const apiPricing = i.plan_pricing || null;
        const planForType = linodeTypes.find(t => t.id === (i.configuration?.type || ''));
        const specs = apiSpecs ? {
          vcpus: Number(apiSpecs.vcpus || 0),
          memory: Number(apiSpecs.memory || 0),
          disk: Number(apiSpecs.disk || 0),
          transfer: Number(apiSpecs.transfer || 0),
        } : planForType ? {
          vcpus: planForType.vcpus,
          memory: planForType.memory,
          disk: planForType.disk,
          transfer: planForType.transfer,
        } : { vcpus: 0, memory: 0, disk: 0, transfer: 0 };
        const pricing = apiPricing ? {
          hourly: Number(apiPricing.hourly || 0),
          monthly: Number(apiPricing.monthly || 0),
        } : planForType ? {
          hourly: planForType.price.hourly,
          monthly: planForType.price.monthly,
        } : { hourly: 0, monthly: 0 };
        // Normalize status: treat provider 'offline' as 'stopped' for UI/actions
        const normalizedStatus = ((i.status as any) || 'provisioning') === 'offline' ? 'stopped' : ((i.status as any) || 'provisioning');
        return ({
        id: i.id,
        label: i.label,
        status: normalizedStatus,
        type: i.configuration?.type || '',
        region: i.configuration?.region || '',
        regionLabel: i.region_label || undefined,
        image: i.configuration?.image || '',
        ipv4: i.ip_address ? [i.ip_address] : [],
        ipv6: '',
        created: i.created_at,
        specs,
        stats: { cpu: 0, memory: 0, disk: 0, network: { in: 0, out: 0 }, uptime: '' },
        pricing
      });
      });

      setInstances(mapped);
    } catch (error: any) {
      console.error('Failed to load VPS instances:', error);
      toast.error(error.message || 'Failed to load VPS instances');
    } finally {
      setLoading(false);
    }
  };

  const handleInstanceAction = async (instanceId: string, action: 'boot' | 'shutdown' | 'reboot' | 'delete') => {
    try {
      if (action === 'delete') {
        const inst = instances.find(i => i.id === instanceId);
        setDeleteModal({ open: true, id: instanceId, label: inst?.label || '', input: '', password: '', confirmCheckbox: false, loading: false, error: '' });
        return;
      }
      let url = `/api/vps/${instanceId}`;
      let method: 'POST' | 'DELETE' = 'POST';
      if (action === 'boot') url += '/boot';
      else if (action === 'shutdown') url += '/shutdown';
      else if (action === 'reboot') url += '/reboot';

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed to ${action} instance`);

      // Refresh from server for accurate status/IP sync
      await loadInstances();
      toast.success(`Instance ${action} initiated successfully`);
    } catch (error: any) {
      console.error(`Failed to ${action} instance:`, error);
      toast.error(error.message || `Failed to ${action} instance`);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  const confirmDeleteInstance = async () => {
    try {
      if (deleteModal.input.trim() !== deleteModal.label.trim()) {
        setDeleteModal(m => ({ ...m, error: 'Name does not match. Type the exact server name.' }));
        return;
      }
      
      if (!deleteModal.password.trim()) {
        setDeleteModal(m => ({ ...m, error: 'Please enter your account password.' }));
        return;
      }
      
      if (!deleteModal.confirmCheckbox) {
        setDeleteModal(m => ({ ...m, error: 'Please confirm deletion by checking the checkbox.' }));
        return;
      }
      
      setDeleteModal(m => ({ ...m, loading: true, error: '' }));
      
      const res = await fetch(`/api/vps/${deleteModal.id}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ password: deleteModal.password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete instance');
      setDeleteModal({ open: false, id: '', label: '', input: '', password: '', confirmCheckbox: false, loading: false, error: '' });
      await loadInstances();
      toast.success('Instance deleted');
    } catch (err: any) {
      setDeleteModal(m => ({ ...m, loading: false, error: err.message || 'Failed to delete instance' }));
      console.error('Delete instance error:', err);
    }
  };

  const handleCreateInstance = async () => {
    if (!createForm.label || !createForm.rootPassword) {
      toast.error('Label and root password are required');
      return;
    }

    if (!createForm.type) {
      toast.error('Please select a plan');
      return;
    }

    if (!createForm.region) {
      toast.error('Region is required. Please select a plan with a configured region.');
      return;
    }

    // Calculate total cost including backups
    const selectedType = linodeTypes.find(t => t.id === createForm.type);
    if (!selectedType) {
      toast.error('Selected plan not found');
      return;
    }

    let totalHourlyCost = selectedType.price.hourly;
    if (createForm.backups) {
      totalHourlyCost += selectedType.price.hourly * 0.4; // 40% additional for backups
    }

    // Check wallet balance
    try {
      const walletBalance = await paymentService.getWalletBalance();
      if (!walletBalance || walletBalance.balance < totalHourlyCost) {
        toast.error(`Insufficient wallet balance. Required: $${totalHourlyCost.toFixed(4)}/hour, Available: $${walletBalance?.balance.toFixed(2) || '0.00'}`);
        return;
      }
    } catch (error) {
      console.error('Failed to check wallet balance:', error);
      toast.error('Failed to verify wallet balance. Please try again.');
      return;
    }

  try {
      // Enforce image compatibility and validate fields for Marketplace/StackScript
      if (selectedStackScript && Array.isArray(selectedStackScript.images)) {
        const allowed = selectedStackScript.images as string[];
        const knownIds = new Set((linodeImages || []).map((i: any) => i.id));
        const allowedKnown = allowed.filter(id => knownIds.has(id));
        // If the script is unrestricted (any/all), skip strict enforcement
        if (allowedKnown.length > 0) {
          if (!createForm.image || !allowedKnown.includes(createForm.image)) {
            toast.error('Selected OS image is not compatible with the selected application. Choose an allowed image.');
            return;
          }
        }
      }
      if (selectedStackScript && Array.isArray(selectedStackScript.user_defined_fields)) {
        const missing = (selectedStackScript.user_defined_fields || []).filter((f: any) => {
          const val = stackscriptData[f.name];
          return val === undefined || val === null || String(val).trim() === '';
        });
        if (missing.length > 0) {
          const first = missing[0];
          toast.error(`Please fill required field: ${first.label || first.name}`);
          return;
        }
      }

      // Build request body supporting Marketplace apps
      const isMarketplace = Boolean((selectedStackScript as any)?.isMarketplace);
      const body: any = {
        label: createForm.label,
        type: createForm.type,
        region: createForm.region,
        image: createForm.image,
        rootPassword: createForm.rootPassword,
        sshKeys: createForm.sshKeys,
        backups: createForm.backups,
        privateIP: createForm.privateIP,
      };
      if (isMarketplace) {
        body.appSlug = (selectedStackScript as any)?.appSlug;
        body.appData = stackscriptData;
      } else {
        body.stackscriptId = selectedStackScript?.id || undefined;
        body.stackscriptData = selectedStackScript ? stackscriptData : undefined;
      }

      const res = await fetch('/api/vps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const payload = await res.json();
      if (!res.ok) {
        // Handle specific error codes with better user feedback
        if (payload.code === 'INSUFFICIENT_BALANCE') {
          toast.error(`Insufficient wallet balance. You need $${payload.required?.toFixed(4) || 'unknown'} but only have $${payload.available?.toFixed(2) || 'unknown'}. Please add funds to your wallet.`);
        } else if (payload.code === 'WALLET_NOT_FOUND') {
          toast.error('No wallet found for your organization. Please contact support.');
        } else if (payload.code === 'WALLET_CHECK_FAILED') {
          toast.error('Failed to verify wallet balance. Please try again.');
        } else {
          toast.error(payload.error || 'Failed to create VPS');
        }
        return;
      }

      // VPS creation successful - show appropriate message based on billing status
      if (payload.billing?.success) {
        toast.success(`VPS "${createForm.label}" created successfully! ${payload.billing.message}`);
      } else {
        toast.warning(`VPS "${createForm.label}" created successfully, but ${payload.billing?.message || 'initial billing failed'}. You will be billed hourly as normal.`);
      }

      // Refresh list from server to reflect new instance
      await loadInstances();

      setShowCreateModal(false);
      setCreateForm({
        label: '',
        type: '',
        region: 'us-east',
        image: 'linode/ubuntu22.04',
        rootPassword: '',
        sshKeys: [],
        backups: false,
        privateIP: false
      });
      setSelectedStackScript(null);
      setStackscriptData({});
    } catch (error) {
      console.error('Failed to create VPS instance:', error);
      toast.error('Failed to create VPS instance');
    }
  };

  const filteredInstances = instances.filter(instance => {
    const matchesSearch = instance.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         instance.ipv4[0].includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || instance.status === statusFilter;
    const matchesRegion = regionFilter === 'all' || instance.region === regionFilter;
    return matchesSearch && matchesStatus && matchesRegion;
  });

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'running':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'stopped':
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800';
      case 'provisioning':
        return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20';
      case 'rebooting':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'error':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800';
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 GB';
    const gb = bytes / 1024;
    return `${gb.toFixed(0)} GB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Multi-step modal helpers
  const totalSteps = 4;
  const canProceed = useMemo(() => {
    if (createStep === 1) return Boolean(createForm.label && createForm.type && createForm.region);
    if (createStep === 3) return Boolean(createForm.image);
    return true;
  }, [createStep, createForm.label, createForm.type, createForm.region, createForm.image]);

  const handleNext = () => setCreateStep((s) => Math.min(s + 1, totalSteps));
  const handleBack = () => setCreateStep((s) => Math.max(1, s - 1));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading VPS instances...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">VPS Management</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Manage your VPS instances and monitor their performance
              </p>
            </div>
            <button
              onClick={() => { setCreateStep(1); setShowCreateModal(true); }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create VPS
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="space-y-4">
            {/* Search Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search instances..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                />
              </div>
              <div className="flex items-center">
                <button
                  onClick={loadInstances}
                  className="inline-flex items-center px-4 py-2.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </button>
              </div>
            </div>
            
            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                  >
                    <option value="all">All Status</option>
                    <option value="running">Running</option>
                    <option value="stopped">Stopped</option>
                    <option value="provisioning">Provisioning</option>
                    <option value="rebooting">Rebooting</option>
                  </select>
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Region
                  </label>
                  <select
                    value={regionFilter}
                    onChange={(e) => setRegionFilter(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                  >
                    <option value="all">All Regions</option>
                    {allowedRegions.map(region => (
                      <option key={region.id} value={region.id}>{region.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* VPS Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Power className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Running</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {instances.filter(i => i.status === 'running').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <PowerOff className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Stopped</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {instances.filter(i => i.status === 'stopped').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Server className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{instances.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly Cost</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(instances.reduce((sum, i) => sum + i.pricing.monthly, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* VPS List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">VPS Instances ({filteredInstances.length})</h2>
          </div>
          <div className="p-6">
            {filteredInstances.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 dark:text-gray-500 mb-4">
                  <Server className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No VPS instances found</h3>
                <p className="text-gray-500 dark:text-gray-400">Get started by creating your first VPS instance.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInstances.map((instance) => (
                  <div key={instance.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 hover:shadow-md">
                    <div className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        {/* Left Section - Instance Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-4">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{instance.label}</h3>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(instance.status)}`}>
                                  <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                    instance.status === 'running' ? 'bg-green-400' :
                                    instance.status === 'stopped' ? 'bg-red-400' :
                                    instance.status === 'provisioning' ? 'bg-yellow-400' :
                                    'bg-gray-400'
                                  }`}></div>
                                  {instance.status.replace('_', ' ')}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                <span className="font-mono">{instance.ipv4[0]}</span>
                                <span>{(instance.regionLabel || allowedRegions.find(r => r.id === instance.region)?.label || instance.region)}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Specs Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                            <div>
                              <div className="text-gray-500 dark:text-gray-400">CPU</div>
                              <div className="font-medium text-gray-900 dark:text-white">{instance.specs.vcpus} vCPU</div>
                            </div>
                            <div>
                              <div className="text-gray-500 dark:text-gray-400">Memory</div>
                              <div className="font-medium text-gray-900 dark:text-white">{formatBytes(instance.specs.memory)}</div>
                            </div>
                            <div>
                              <div className="text-gray-500 dark:text-gray-400">Storage</div>
                              <div className="font-medium text-gray-900 dark:text-white">{Math.round(instance.specs.disk / 1024)} GB</div>
                            </div>
                            <div>
                              <div className="text-gray-500 dark:text-gray-400">Transfer</div>
                              <div className="font-medium text-gray-900 dark:text-white">{Math.round(instance.specs.transfer / 1024)} GB</div>
                            </div>
                            <div>
                              <div className="text-gray-500 dark:text-gray-400">Hourly</div>
                              <div className="font-medium text-gray-900 dark:text-white">{formatCurrency(instance.pricing.hourly)}</div>
                            </div>
                            <div>
                              <div className="text-gray-500 dark:text-gray-400">Monthly</div>
                              <div className="font-medium text-gray-900 dark:text-white">{formatCurrency(instance.pricing.monthly)}</div>
                            </div>
                          </div>
                        </div>

                        {/* Right Section - Actions */}
                        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                          {/* Actions */}
                          <div className="flex flex-wrap gap-2 lg:flex-nowrap lg:justify-end">
                            {instance.status === 'running' ? (
                              <>
                                <button
                                  onClick={() => handleInstanceAction(instance.id, 'shutdown')}
                                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors min-w-[80px] justify-center"
                                  title="Shutdown"
                                >
                                  <PowerOff className="h-4 w-4" />
                                  <span className="hidden sm:inline">Stop</span>
                                </button>
                                <button
                                  onClick={() => handleInstanceAction(instance.id, 'reboot')}
                                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors min-w-[80px] justify-center"
                                  title="Reboot"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                  <span className="hidden sm:inline">Reboot</span>
                                </button>
                              </>
                            ) : instance.status === 'stopped' ? (
                              <button
                                onClick={() => handleInstanceAction(instance.id, 'boot')}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors min-w-[80px] justify-center"
                                title="Boot"
                              >
                                <Power className="h-4 w-4" />
                                <span className="hidden sm:inline">Start</span>
                              </button>
                            ) : null}
                            
                            <Link
                              to={`/vps/${instance.id}`}
                              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-center text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors min-w-[80px] justify-center"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                              <span className="hidden sm:inline">Details</span>
                            </Link>
                            
                            {instance.status !== 'restoring' && instance.status !== 'backing_up' && (
                              <button
                                onClick={() => handleInstanceAction(instance.id, 'delete')}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors min-w-[80px] justify-center"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="hidden sm:inline">Delete</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create VPS Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Create New VPS Instance</h3>
                <div className="space-y-4">
                  {/* Step indicator */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-600 dark:text-gray-400">Step {createStep} of {totalSteps}</div>
                    <div className="flex items-center space-x-1">
                      {[...Array(totalSteps)].map((_, i) => (
                        <span key={i} className={`w-2 h-2 rounded-full ${i + 1 <= createStep ? 'bg-blue-600 dark:bg-blue-400' : 'bg-gray-300 dark:bg-gray-600'}`}></span>
                      ))}
                    </div>
                  </div>
                  {createStep === 1 && (<>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Label *
                    </label>
                    <input
                      type="text"
                      value={createForm.label}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, label: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                      placeholder="my-server"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Plan
                    </label>
                    <select
                      value={createForm.type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        const selectedType = linodeTypes.find(t => t.id === newType);
                        
                        // Ensure region is properly assigned from the selected plan
                        const newRegion = selectedType?.region || '';
                        
                        setCreateForm(prev => ({
                          ...prev,
                          type: newType,
                          region: newRegion,
                        }));
                        // Gracefully handle plans without a preset region without logging
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                    >
                      <option value="">Click to choose plan</option>
                      {linodeTypes.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Region
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white">
                      {createForm.type && createForm.region ? (
                        (() => {
                          const selectedRegion = allowedRegions.find(r => r.id === createForm.region);
                          return (
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                              <span className="font-medium">
                                {selectedRegion ? selectedRegion.label : createForm.region}
                              </span>
                              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                (Auto-selected based on plan)
                              </span>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="flex items-center text-gray-500 dark:text-gray-400">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span>Select a plan to see the region</span>
                        </div>
                      )}
                    </div>
                  </div>
                  </>) }

                  {/* 1-Click Deployments Section (always visible) */}
                  {createStep === 2 && (
                  <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        1-Click Deployments (Optional)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {/* None option card */}
                        <div
                          onClick={() => {
                            // Find ssh-key script and select it (but display as "None")
                            const sshKeyScript = linodeStackScripts.find(script => 
                              script.label === 'ssh-key' || 
                              script.id === 'ssh-key' ||
                              (script.label && script.label.toLowerCase().includes('ssh'))
                            );
                            setSelectedStackScript(sshKeyScript || null);
                          }}
                          className={`relative p-3 border rounded-lg cursor-pointer transition-all ${
                            selectedStackScript === null || 
                            (selectedStackScript && (
                              selectedStackScript.label === 'ssh-key' || 
                              selectedStackScript.id === 'ssh-key' ||
                              (selectedStackScript.label && selectedStackScript.label.toLowerCase().includes('ssh'))
                            ))
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                        >
                          <div className="flex flex-col space-y-2">
                            <div className="w-8 h-8 bg-gray-400 rounded-lg flex items-center justify-center">
                              <span className="text-white font-bold text-xs">NO</span>
                            </div>
                            <h4 className="font-medium text-gray-900 dark:text-white text-sm">None</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Provision base OS without a deployment</p>
                          </div>
                          {(selectedStackScript === null || 
                            (selectedStackScript && (
                              selectedStackScript.label === 'ssh-key' || 
                              selectedStackScript.id === 'ssh-key' ||
                              (selectedStackScript.label && selectedStackScript.label.toLowerCase().includes('ssh'))
                            ))) && (
                            <div className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* StackScript cards */}
                        {linodeStackScripts.map((script) => {
                          // Don't show ssh-key script as a separate option since it's the default "None"
                          const isSshKeyScript = script.label === 'ssh-key' || 
                                                script.id === 'ssh-key' ||
                                                (script.label && script.label.toLowerCase().includes('ssh'));
                          
                          if (isSshKeyScript) return null;
                          
                          return (
                            <div
                              key={script.id}
                              onClick={() => setSelectedStackScript(script)}
                              className={`relative p-3 border rounded-lg cursor-pointer transition-all ${
                                selectedStackScript?.id === script.id
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                              }`}
                            >
                              <div className="flex flex-col space-y-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                                  <span className="text-white font-bold text-xs">
                                    {String(script.label || '').substring(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">{script.label}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {script.description || 'Automated setup script'}
                                </p>
                              </div>
                              {selectedStackScript?.id === script.id && (
                                <div className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                  <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {selectedStackScript && Array.isArray(selectedStackScript.user_defined_fields) && selectedStackScript.user_defined_fields.length > 0 && (
                        <div className="mt-4 p-3 border rounded-lg bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Deployment Configuration</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                            Allowed base images: {allowedImagesDisplay}
                          </p>
                          <form onSubmit={(e) => e.preventDefault()}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {selectedStackScript.user_defined_fields.map((f: any) => {
                                const value = stackscriptData[f.name] ?? '';
                                const optionsArr = Array.isArray(f.allowed) ? f.allowed : (Array.isArray(f.oneof) ? f.oneof : null);
                                const rawOptions = !optionsArr && typeof f.oneof === 'string' ? String(f.oneof).trim() : '';
                                const parsedOptions = rawOptions ? rawOptions.split(/[|,]/).map((s: string) => s.trim()).filter(Boolean) : [];
                                const options = optionsArr || parsedOptions;
                                const nameLower = String(f.name || '').toLowerCase();
                                const inputType: 'text' | 'password' | 'email' = options && options.length > 0
                                  ? 'text'
                                  : nameLower.includes('password') || nameLower.includes('pass')
                                    ? 'password'
                                    : nameLower.includes('email')
                                      ? 'email'
                                      : 'text';
                                return (
                                  <div key={f.name}>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{f.label || f.name}</label>
                                    {options && options.length > 0 ? (
                                      <select
                                        value={value}
                                        onChange={(e) => setStackscriptData(prev => ({ ...prev, [f.name]: e.target.value }))}
                                        className="w-full text-xs rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                                      >
                                        <option value="">Select</option>
                                        {options.map((opt: string) => (
                                          <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                      </select>
                                    ) : (
                                      <input
                                        type={inputType}
                                        value={value}
                                        onChange={(e) => setStackscriptData(prev => ({ ...prev, [f.name]: e.target.value }))}
                                        placeholder={f.example || f.default || ''}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                                        autoComplete={inputType === 'password' ? 'new-password' : 'off'}
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  )}

                  {createStep === 3 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Operating System
                    </label>
                    {/* Tabs: Templates | ISO */}
                    <div className="flex items-center space-x-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setOsTab('templates')}
                        className={`px-3 py-1.5 text-sm rounded-md border ${osTab === 'templates' ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700'}`}
                      >
                        Templates
                      </button>
                      <button
                        type="button"
                        onClick={() => setOsTab('iso')}
                        className={`px-3 py-1.5 text-sm rounded-md border ${osTab === 'iso' ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700'}`}
                      >
                        ISO
                      </button>
                    </div>

                    {osTab === 'templates' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                        {(
                          ['ubuntu','debian','centos','rockylinux','almalinux','fedora','alpine','arch','opensuse','gentoo','slackware']
                        ).filter(k => effectiveOsGroups[k] && effectiveOsGroups[k].versions.length > 0).map(key => {
                          const group = effectiveOsGroups[key];
                          const selectedVersionId = selectedOSVersion[key] || group.versions[0]?.id;
                          const isSelected = selectedOSGroup === key;
                          const colorMap: Record<string, string> = {
                            ubuntu: 'from-orange-500 to-red-600',
                            debian: 'from-red-500 to-gray-600',
                            centos: 'from-emerald-500 to-teal-600',
                            rockylinux: 'from-green-600 to-emerald-700',
                            almalinux: 'from-rose-500 to-pink-600',
                            fedora: 'from-blue-600 to-indigo-700',
                            alpine: 'from-cyan-500 to-sky-600',
                            arch: 'from-sky-500 to-blue-700',
                            opensuse: 'from-lime-500 to-green-600',
                            gentoo: 'from-purple-500 to-violet-600',
                            slackware: 'from-gray-500 to-gray-700'
                          };
                          const colors = colorMap[key] || 'from-blue-500 to-purple-600';
                          return (
                            <div
                              key={key}
                              className={`p-4 border-2 rounded-lg transition-all cursor-pointer hover:shadow-md ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'}`}
                              onClick={() => {
                                setSelectedOSGroup(key);
                                const idToUse = selectedVersionId || group.versions[0]?.id;
                                if (idToUse) setCreateForm(prev => ({ ...prev, image: idToUse }));
                              }}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors} flex items-center justify-center`}>
                                    <span className="text-white font-bold text-xs">{group.name.slice(0,2).toUpperCase()}</span>
                                  </div>
                                  <h3 className="font-medium text-gray-900 dark:text-white text-sm lowercase">{group.name}</h3>
                                </div>
                                {isSelected && (
                                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Select Version</label>
                                <select
                                  value={selectedVersionId || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedOSVersion(prev => ({ ...prev, [key]: val }));
                                    setCreateForm(prev => ({ ...prev, image: val }));
                                    setSelectedOSGroup(key);
                                  }}
                                  className="w-full text-xs rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                                >
                                  <option value="" disabled>SELECT VERSION</option>
                                  {group.versions.map(v => (
                                    <option key={v.id} value={v.id}>{v.label}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mb-4 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                        ISO install support coming soon. Use Templates for now.
                      </div>
                    )}

                    
                  </div>
                  )}

                  {createStep === 4 && (<>
                  <form onSubmit={(e) => e.preventDefault()}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Root Password *
                      </label>
                      <input
                        type="password"
                        value={createForm.rootPassword}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, rootPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                        placeholder="Enter a strong password"
                        autoComplete="new-password"
                      />
                    </div>
                  </form>

                  <div className="flex items-center space-x-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={createForm.backups}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, backups: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Enable Backups (+40%)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={createForm.privateIP}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, privateIP: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Private IP</span>
                    </label>
                  </div>

                  {/* Plan Details */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Plan Details</h4>
                    {createForm.type && linodeTypes.length > 0 ? (
                      (() => {
                        const selectedType = linodeTypes.find(t => t.id === createForm.type);
                        if (!selectedType) return null;
 const selectedRegion = selectedType.region ? allowedRegions.find(r => r.id === selectedType.region) : null;
                        return (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">vCPUs:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedType.vcpus}</span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Memory:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">{formatBytes(selectedType.memory)}</span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Storage:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">{Math.round(selectedType.disk / 1024)} GB</span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Transfer:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedType.transfer} GB</span>
                            </div>
                            {selectedRegion && (
                              <div className="col-span-2">
                                <span className="text-gray-600 dark:text-gray-400">Region:</span>
                                <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedRegion.label}</span>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Select a plan above to view specifications and pricing details
                        </p>
                      </div>
                    )}
                  </div>
                  </>
                )}
                </div>

                <div className="flex items-center justify-between mt-6">
                  <button
                    onClick={() => { setShowCreateModal(false); setCreateStep(1); }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800"
                  >
                    Cancel
                  </button>
                  <div className="flex items-center space-x-3">
                    {createStep > 1 && (
                      <button
                        onClick={handleBack}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none"
                      >
                        Back
                      </button>
                    )}
                    {createStep < totalSteps && (
                      <button
                        onClick={handleNext}
                        disabled={!canProceed}
                        className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${canProceed ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600' : 'bg-blue-300 cursor-not-allowed'}`}
                      >
                        Next
                      </button>
                    )}
                    {createStep === totalSteps && (
                      <button
                        onClick={handleCreateInstance}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800"
                      >
                        Create VPS
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {deleteModal.open && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-full max-w-lg shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Confirm Delete</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">To confirm deletion, type the server name exactly:</p>
                <div className="mt-2 flex items-center space-x-2">
                  <p className="text-sm font-mono px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded">{deleteModal.label}</p>
                  <button
                    onClick={() => copyToClipboard(deleteModal.label)}
                    className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    title="Copy server name"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Server name</label>
                    <input
                      type="text"
                      value={deleteModal.input}
                      onChange={(e) => setDeleteModal(m => ({ ...m, input: e.target.value, error: '' }))}
                      placeholder="Type the server name to confirm"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      autoComplete="off"
                    />
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Password</label>
                    <input
                      type="password"
                      value={deleteModal.password}
                      onChange={(e) => setDeleteModal(m => ({ ...m, password: e.target.value, error: '' }))}
                      placeholder="Enter your account password"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      autoComplete="current-password"
                    />
                  </div>
                </form>
                
                <div className="mt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={deleteModal.confirmCheckbox}
                      onChange={(e) => setDeleteModal(m => ({ ...m, confirmCheckbox: e.target.checked, error: '' }))}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      I understand that this action cannot be undone and will permanently delete the VPS and all its data.
                    </span>
                  </label>
                  {deleteModal.error && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{deleteModal.error}</p>
                  )}
                </div>
                <div className="flex items-center justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setDeleteModal({ open: false, id: '', label: '', input: '', password: '', confirmCheckbox: false, loading: false, error: '' })}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-red-400 dark:focus:ring-offset-gray-800"
                    disabled={deleteModal.loading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteInstance}
                    disabled={deleteModal.loading || deleteModal.input.trim() !== deleteModal.label.trim() || !deleteModal.password.trim() || !deleteModal.confirmCheckbox}
                    className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${deleteModal.input.trim() === deleteModal.label.trim() && deleteModal.password.trim() && deleteModal.confirmCheckbox ? 'bg-red-600 hover:bg-red-700' : 'bg-red-400 cursor-not-allowed'}`}
                  >
                    {deleteModal.loading ? 'Deleting...' : 'Delete Server'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VPS;