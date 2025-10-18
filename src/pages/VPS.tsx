/**
 * VPS Management Page
 * Handles Linode VPS instance creation, management, and monitoring
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Server,
  Plus,
  RefreshCw,
  Search,
  MapPin,
  DollarSign,
  Power,
  PowerOff,
  Copy,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
// Navigation provided by AppLayout
import { useAuth } from '../contexts/AuthContext';
import { paymentService } from '../services/paymentService';
import { VpsInstancesTable } from '@/components/VPS/VpsTable.js';
import { BulkDeleteModal } from '@/components/VPS/BulkDeleteModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { VPSInstance } from '@/types/vps';

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
  const [selectedInstances, setSelectedInstances] = useState<VPSInstance[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState<number>(1);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string; label: string; input: string; password: string; confirmCheckbox: boolean; loading: boolean; error: string }>({ open: false, id: '', label: '', input: '', password: '', confirmCheckbox: false, loading: false, error: '' });
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
  const [linodeImages, setLinodeImages] = useState<any[]>([]);
  const [linodeStackScripts, setLinodeStackScripts] = useState<any[]>([]);
  const [selectedStackScript, setSelectedStackScript] = useState<any | null>(null);
  const [stackscriptData, setStackscriptData] = useState<Record<string, any>>({});
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
  }, [selectedStackScript, linodeImages, createForm.image]);

  const loadVPSPlans = useCallback(async () => {
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
    }
  }, [token]);

  const loadLinodeImages = useCallback(async () => {
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
  }, [token]);

  const loadLinodeStackScripts = useCallback(async () => {
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
  }, [token]);

  const loadInstances = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vps', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to load VPS instances');

      const clampPercent = (value: unknown): number | null => {
        if (value === null || typeof value === 'undefined') return null;
        const numeric = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(numeric)) return null;
        if (numeric < 0) return 0;
        if (numeric > 100) return 100;
        return numeric;
      };

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
        const rawProgress = i && typeof i.provider_progress === 'object' && i.provider_progress !== null
          ? i.provider_progress
          : null;
        const percentFromEvent = rawProgress ? clampPercent(rawProgress.percent) : null;
        const percentFromRow = clampPercent(i?.progress_percent);
        const progress = rawProgress || percentFromRow !== null ? {
          percent: percentFromEvent ?? percentFromRow,
          action: rawProgress?.action ?? null,
          status: rawProgress?.status ?? null,
          message: rawProgress?.message ?? null,
          created: rawProgress?.created ?? null,
        } : undefined;
        // Normalize status: treat provider 'offline' as 'stopped' for UI/actions
        const normalizedStatus = ((i.status as any) || 'provisioning') === 'offline' ? 'stopped' : ((i.status as any) || 'provisioning');
        const instance: VPSInstance = {
          id: String(i.id),
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
          pricing,
          progress: progress ?? undefined,
        };
        return instance;
      });

      setInstances(mapped);
    } catch (error: any) {
      console.error('Failed to load VPS instances:', error);
      toast.error(error.message || 'Failed to load VPS instances');
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

  // Simple polling: refresh instances while any are provisioning or rebooting
  useEffect(() => {
    const hasPending = instances.some(i => i.status === 'provisioning' || i.status === 'rebooting');
    if (!hasPending) return;
    const interval = setInterval(() => {
      loadInstances();
    }, 10000);
    return () => clearInterval(interval);
  }, [instances, loadInstances]);

  // Load images and stack scripts when create modal opens
  useEffect(() => {
    if (showCreateModal) {
      loadLinodeImages();
      loadLinodeStackScripts();
    }
  }, [showCreateModal, loadLinodeImages, loadLinodeStackScripts]);

  const handleInstanceAction = async (instanceId: string, action: 'boot' | 'shutdown' | 'reboot' | 'delete') => {
    try {
      if (action === 'delete') {
        const inst = instances.find(i => i.id === instanceId);
        setDeleteModal({ open: true, id: instanceId, label: inst?.label || '', input: '', password: '', confirmCheckbox: false, loading: false, error: '' });
        return;
      }
  let url = `/api/vps/${instanceId}`;
  const method: 'POST' | 'DELETE' = 'POST';
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

  const handleBulkAction = async (action: 'boot' | 'shutdown' | 'reboot' | 'delete') => {
    if (selectedInstances.length === 0) return;

    // For delete action, show modal instead of window.confirm
    if (action === 'delete') {
      setShowBulkDeleteModal(true);
      return;
    }

    // For restart action, show confirmation dialog
    if (action === 'reboot') {
      const confirmed = window.confirm(
        `Are you sure you want to restart ${selectedInstances.length} instance${selectedInstances.length > 1 ? 's' : ''}?\n\n` +
        `The following instances will be restarted:\n` +
        selectedInstances.map(instance => `• ${instance.label}`).join('\n')
      );
      if (!confirmed) return;
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process each instance
    for (const instance of selectedInstances) {
      try {
        // Skip if action doesn't make sense for current status
        if (action === 'boot' && instance.status === 'running') continue;
        if (action === 'shutdown' && instance.status === 'stopped') continue;
        if (action === 'reboot' && instance.status !== 'running') continue;

        let url = `/api/vps/${instance.id}`;
        let method: 'POST' | 'DELETE' = 'POST';
        
        if (action === 'boot') url += '/boot';
        else if (action === 'shutdown') url += '/shutdown';
        else if (action === 'reboot') url += '/reboot';
        else if (action === 'delete') method = 'DELETE';

        const res = await fetch(url, {
          method,
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          },
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Failed to ${action} ${instance.label}`);

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${instance.label}: ${error.message}`);
        console.error(`Failed to ${action} instance ${instance.label}:`, error);
      }
    }

    // Clear selection
    setSelectedInstances([]);

    // Refresh instances
    await loadInstances();

    // Show results
    if (results.success > 0 && results.failed === 0) {
      toast.success(`Successfully ${action === 'boot' ? 'started' : action === 'shutdown' ? 'stopped' : action === 'reboot' ? 'restarted' : 'deleted'} ${results.success} instance${results.success > 1 ? 's' : ''}`);
    } else if (results.success > 0 && results.failed > 0) {
      toast.warning(`${results.success} instance${results.success > 1 ? 's' : ''} ${action === 'boot' ? 'started' : action === 'shutdown' ? 'stopped' : action === 'reboot' ? 'restarted' : 'deleted'} successfully, ${results.failed} failed`);
    } else if (results.failed > 0) {
      toast.error(`Failed to ${action} ${results.failed} instance${results.failed > 1 ? 's' : ''}${results.errors.length > 0 ? ':\n' + results.errors.join('\n') : ''}`);
    }
  };

  const handleBulkDelete = async (password: string) => {
    if (selectedInstances.length === 0) return;

    setBulkDeleteLoading(true);

    try {
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      };

      // Process each instance
      for (const instance of selectedInstances) {
        try {
          const res = await fetch(`/api/vps/${instance.id}`, {
            method: 'DELETE',
            headers: { 
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify({ password })
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || `Failed to delete ${instance.label}`);

          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(`${instance.label}: ${error.message}`);
          console.error(`Failed to delete instance ${instance.label}:`, error);
        }
      }

      // Clear selection and close modal
      setSelectedInstances([]);
      setShowBulkDeleteModal(false);

      // Refresh instances
      await loadInstances();

      // Show results
      if (results.success > 0 && results.failed === 0) {
        toast.success(`Successfully deleted ${results.success} instance${results.success > 1 ? 's' : ''}`);
      } else if (results.success > 0 && results.failed > 0) {
        toast.warning(`${results.success} instance${results.success > 1 ? 's' : ''} deleted successfully, ${results.failed} failed`);
      } else if (results.failed > 0) {
        toast.error(`Failed to delete ${results.failed} instance${results.failed > 1 ? 's' : ''}${results.errors.length > 0 ? ':\n' + results.errors.join('\n') : ''}`);
      }
    } catch (error: any) {
      console.error('Bulk delete failed:', error);
      throw error; // Re-throw to let modal handle the error
    } finally {
      setBulkDeleteLoading(false);
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

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 GB';
    const gb = bytes / 1024;
    return `${gb.toFixed(0)} GB`;
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">VPS Management</h1>
              <p className="mt-2 text-muted-foreground">
                Manage your VPS instances and monitor their performance
              </p>
            </div>
            <button
              onClick={() => { setCreateStep(1); setShowCreateModal(true); }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create VPS
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Search Row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground " />
                  <input
                    type="text"
                    placeholder="Search instances..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border rounded-md bg-secondary text-foreground placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div className="flex items-center">
                  <button
                    onClick={loadInstances}
                    className="inline-flex items-center px-4 py-2.5 border border shadow-sm text-sm leading-4 font-medium rounded-md text-muted-foreground bg-secondary hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
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
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2.5 border border rounded-md bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
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
                      className="w-full px-3 py-2.5 border border rounded-md bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
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
                  <p className="text-sm font-medium text-muted-foreground">Running</p>
                  <p className="text-2xl font-bold">
                    {instances.filter(i => i.status === 'running').length}
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
                  <p className="text-sm font-medium text-muted-foreground">Stopped</p>
                  <p className="text-2xl font-bold">
                    {instances.filter(i => i.status === 'stopped').length}
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
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Monthly Cost</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(instances.reduce((sum, i) => sum + i.pricing.monthly, 0))}
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
                    {selectedInstances.length} instance{selectedInstances.length > 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-2">
                  <Button
                    onClick={() => handleBulkAction('boot')}
                    variant="secondary"
                    size="sm"
                    className="text-green-700 bg-green-100 border-green-300 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/30 min-h-[44px] touch-manipulation flex-1 sm:flex-none"
                    disabled={selectedInstances.every(instance => instance.status === 'running')}
                  >
                    <Power className="h-4 w-4 mr-1" />
                    <span className="hidden xs:inline">Start</span>
                    <span className="xs:hidden">▶️</span>
                  </Button>
                  <Button
                    onClick={() => handleBulkAction('shutdown')}
                    variant="secondary"
                    size="sm"
                    className="text-orange-700 bg-orange-100 border-orange-300 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-900/30 min-h-[44px] touch-manipulation flex-1 sm:flex-none"
                    disabled={selectedInstances.every(instance => instance.status === 'stopped')}
                  >
                    <PowerOff className="h-4 w-4 mr-1" />
                    <span className="hidden xs:inline">Stop</span>
                    <span className="xs:hidden">⏹️</span>
                  </Button>
                  <Button
                    onClick={() => handleBulkAction('reboot')}
                    variant="default"
                    size="sm"
                    className="min-h-[44px] touch-manipulation flex-1 sm:flex-none"
                    disabled={selectedInstances.every(instance => instance.status !== 'running')}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    <span className="hidden xs:inline">Restart</span>
                    <span className="xs:hidden">🔄</span>
                  </Button>
                  <Button
                    onClick={() => handleBulkAction('delete')}
                    variant="destructive"
                    size="sm"
                    className="min-h-[44px] touch-manipulation flex-1 sm:flex-none"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    <span className="hidden xs:inline">Delete</span>
                    <span className="xs:hidden">🗑️</span>
                  </Button>
                  <Button
                    onClick={() => setSelectedInstances([])}
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
            <CardTitle>
              VPS Instances ({filteredInstances.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VpsInstancesTable
              instances={filteredInstances}
              allowedRegions={allowedRegions}
              onAction={handleInstanceAction}
              onCopy={copyToClipboard}
              onSelectionChange={setSelectedInstances}
              isLoading={loading && instances.length > 0}
            />
          </CardContent>
        </Card>

        {/* Create VPS Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 bg-background dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border w-full max-w-2xl shadow-lg rounded-md bg-card">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-foreground mb-4">Create New VPS Instance</h3>
                <div className="space-y-4">
                  {/* Step indicator */}
                  <div className="mb-6">
                    <div className="text-xs text-muted-foreground mb-3">Step {createStep} of {totalSteps}</div>
                    <div className="flex items-center justify-between">
                      {[...Array(totalSteps)].map((_, i) => {
                        const stepNumber = i + 1;
                        const isCompleted = stepNumber < createStep;
                        const isCurrent = stepNumber === createStep;
                        
                        return (
                          <React.Fragment key={i}>
                            <div className="flex flex-col items-center">
                              <div
                                className={`
                                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all duration-200
                                  ${isCompleted 
                                    ? 'bg-primary border-primary text-primary-foreground' 
                                    : isCurrent 
                                    ? 'bg-primary border-primary text-primary-foreground ring-2 ring-primary/20' 
                                    : 'bg-background border-muted text-muted-foreground'
                                  }
                                `}
                              >
                                {isCompleted ? '✓' : stepNumber}
                              </div>
                              <div className={`mt-1 text-xs ${isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                {stepNumber === 1 && 'Region'}
                                {stepNumber === 2 && 'Deployments'}
                                {stepNumber === 3 && 'OS'}
                                {stepNumber === 4 && 'Finalize'}
                              </div>
                            </div>
                            {i < totalSteps - 1 && (
                              <div 
                                className={`
                                  flex-1 h-0.5 mx-2 transition-all duration-200
                                  ${stepNumber < createStep ? 'bg-primary' : 'bg-muted'}
                                `}
                              />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                  {createStep === 1 && (<>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Label *
                    </label>
                    <input
                      type="text"
                      value={createForm.label}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, label: e.target.value }))}
                      className="w-full px-3 py-2 border border rounded-md bg-secondary text-foreground placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      placeholder="my-server"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
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
                      className="w-full px-3 py-2 border border rounded-md bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
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
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Region
                    </label>
                    <div className="w-full px-3 py-2 border border rounded-md bg-muted text-foreground">
                      {createForm.type && createForm.region ? (
                        (() => {
                          const selectedRegion = allowedRegions.find(r => r.id === createForm.region);
                          return (
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 text-muted-foreground mr-2" />
                              <span className="font-medium">
                                {selectedRegion ? selectedRegion.label : createForm.region}
                              </span>
                              <span className="ml-2 text-sm text-muted-foreground">
                                (Auto-selected based on plan)
                              </span>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="flex items-center text-muted-foreground">
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
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
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
                              ? 'border-primary bg-primary/10 dark:bg-primary/20 dark:border-primary'
                              : 'border hover:border-input dark:hover:border-gray-500'
                          }`}
                        >
                          <div className="flex flex-col space-y-2">
                            <div className="w-8 h-8 bg-gray-400 rounded-lg flex items-center justify-center">
                              <span className="text-white font-bold text-xs">NO</span>
                            </div>
                            <h4 className="font-medium text-foreground text-sm">None</h4>
                            <p className="text-xs text-muted-foreground truncate">Provision base OS without a deployment</p>
                          </div>
                          {(selectedStackScript === null || 
                            (selectedStackScript && (
                              selectedStackScript.label === 'ssh-key' || 
                              selectedStackScript.id === 'ssh-key' ||
                              (selectedStackScript.label && selectedStackScript.label.toLowerCase().includes('ssh'))
                            ))) && (
                            <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
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
                                  ? 'border-primary bg-primary/10 dark:bg-primary/20 dark:border-primary'
                                  : 'border hover:border-input dark:hover:border-gray-500'
                              }`}
                            >
                              <div className="flex flex-col space-y-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                                  <span className="text-white font-bold text-xs">
                                    {String(script.label || '').substring(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <h4 className="font-medium text-foreground text-sm truncate">{script.label}</h4>
                                <p className="text-xs text-muted-foreground truncate">
                                  {script.description || 'Automated setup script'}
                                </p>
                              </div>
                              {selectedStackScript?.id === script.id && (
                                <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
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
                        <div className="mt-4 p-3 border rounded-lg bg-muted/30 border">
                          <h4 className="text-sm font-medium text-foreground mb-2">Deployment Configuration</h4>
                          <p className="text-xs text-muted-foreground mb-2">
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
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">{f.label || f.name}</label>
                                    {options && options.length > 0 ? (
                                      <select
                                        value={value}
                                        onChange={(e) => setStackscriptData(prev => ({ ...prev, [f.name]: e.target.value }))}
                                        className="w-full text-xs rounded-md border bg-secondary text-foreground shadow-sm focus:border-primary focus:ring-primary"
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
                                        className="w-full px-3 py-2 border border rounded-md bg-secondary text-foreground placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
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
                    <label className="block text-sm font-medium text-muted-foreground mb-3">
                      Operating System
                    </label>
                    {/* Tabs: Templates | ISO */}
                    <div className="flex items-center space-x-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setOsTab('templates')}
                        className={`px-3 py-1.5 text-sm rounded-md border ${osTab === 'templates' ? 'border-primary text-primary bg-primary/10 dark:bg-primary/20' : 'border text-muted-foreground bg-secondary'}`}
                      >
                        Templates
                      </button>
                      <button
                        type="button"
                        onClick={() => setOsTab('iso')}
                        className={`px-3 py-1.5 text-sm rounded-md border ${osTab === 'iso' ? 'border-primary text-primary bg-primary/10 dark:bg-primary/20' : 'border text-muted-foreground bg-secondary'}`}
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
                            centos: 'from-emerald-500 to-emerald-600',
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
                              className={`p-4 border-2 rounded-lg transition-all cursor-pointer hover:shadow-md ${isSelected ? 'border-primary bg-primary/10 dark:bg-primary/20 dark:border-primary' : 'border hover:border-input dark:hover:border-gray-500'}`}
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
                                  <h3 className="font-medium text-foreground text-sm lowercase">{group.name}</h3>
                                </div>
                                {isSelected && (
                                  <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Select Version</label>
                                <select
                                  value={selectedVersionId || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedOSVersion(prev => ({ ...prev, [key]: val }));
                                    setCreateForm(prev => ({ ...prev, image: val }));
                                    setSelectedOSGroup(key);
                                  }}
                                  className="w-full text-xs rounded-md border bg-secondary text-foreground shadow-sm focus:border-primary focus:ring-primary"
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
                      <div className="mb-4 p-4 border border-dashed border rounded-lg text-sm text-muted-foreground">
                        ISO install support coming soon. Use Templates for now.
                      </div>
                    )}

                    
                  </div>
                  )}

                  {createStep === 4 && (<>
                  <form onSubmit={(e) => e.preventDefault()}>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Root Password *
                      </label>
                      <input
                        type="password"
                        value={createForm.rootPassword}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, rootPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border rounded-md bg-secondary text-foreground placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
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
                        className="h-4 w-4 text-primary focus:ring-primary border rounded bg-secondary"
                      />
                      <span className="ml-2 text-sm text-muted-foreground">Enable Backups (+40%)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={createForm.privateIP}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, privateIP: e.target.checked }))}
                        className="h-4 w-4 text-primary focus:ring-primary border rounded bg-secondary"
                      />
                      <span className="ml-2 text-sm text-muted-foreground">Private IP</span>
                    </label>
                  </div>

                  {/* Plan Details */}
                  <div className="bg-muted rounded-lg p-4">
                    <h4 className="text-sm font-medium text-foreground mb-2">Plan Details</h4>
                    {createForm.type && linodeTypes.length > 0 ? (
                      (() => {
                        const selectedType = linodeTypes.find(t => t.id === createForm.type);
                        if (!selectedType) return null;
 const selectedRegion = selectedType.region ? allowedRegions.find(r => r.id === selectedType.region) : null;
                        return (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">vCPUs:</span>
                              <span className="ml-2 font-medium text-foreground">{selectedType.vcpus}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Memory:</span>
                              <span className="ml-2 font-medium text-foreground">{formatBytes(selectedType.memory)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Storage:</span>
                              <span className="ml-2 font-medium text-foreground">{Math.round(selectedType.disk / 1024)} GB</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Transfer:</span>
                              <span className="ml-2 font-medium text-foreground">{selectedType.transfer} GB</span>
                            </div>
                            {selectedRegion && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Region:</span>
                                <span className="ml-2 font-medium text-foreground">{selectedRegion.label}</span>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">
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
                    className="px-4 py-2 border border rounded-md text-sm font-medium text-muted-foreground bg-secondary hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    Cancel
                  </button>
                  <div className="flex items-center space-x-3">
                    {createStep > 1 && (
                      <Button
                        onClick={handleBack}
                        variant="secondary"
                      >
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
                      <Button
                        onClick={handleCreateInstance}
                        variant="default"
                      >
                        Create VPS
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {deleteModal.open && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 bg-background dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border w-full max-w-lg shadow-lg rounded-md bg-card">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-foreground mb-4">Confirm Delete</h3>
                <p className="text-sm text-gray-600 text-muted-foreground">To confirm deletion, type the server name exactly:</p>
                <div className="mt-2 flex items-center space-x-2">
                  <p className="text-sm font-mono px-2 py-1 bg-secondary text-foreground rounded">{deleteModal.label}</p>
                  <button
                    onClick={() => copyToClipboard(deleteModal.label)}
                    className="p-1 text-muted-foreground hover:text-foreground text-muted-foreground dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                    title="Copy server name"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Server name</label>
                    <input
                      type="text"
                      value={deleteModal.input}
                      onChange={(e) => setDeleteModal(m => ({ ...m, input: e.target.value, error: '' }))}
                      placeholder="Type the server name to confirm"
                      className="w-full px-3 py-2 border border rounded-md bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-red-500"
                      autoComplete="off"
                    />
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Account Password</label>
                    <input
                      type="password"
                      value={deleteModal.password}
                      onChange={(e) => setDeleteModal(m => ({ ...m, password: e.target.value, error: '' }))}
                      placeholder="Enter your account password"
                      className="w-full px-3 py-2 border border rounded-md bg-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-red-500"
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
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border rounded"
                    />
                    <span className="ml-2 text-sm text-muted-foreground">
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
                    className="px-4 py-2 border border rounded-md text-sm font-medium text-muted-foreground bg-secondary hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
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
