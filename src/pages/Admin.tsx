/**
 * Admin Dashboard
 * Manage support tickets and VPS plans
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
// Navigation provided by AppLayout
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Settings, ClipboardList, Ticket, DollarSign, Edit, CheckCircle, AlertCircle, Server, Plus, Trash2, X, FileCode, RefreshCw, Globe, Palette } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/contexts/ThemeContext';

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

interface SupportTicket {
  id: string;
  organization_id: string;
  created_by: string;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  created_at: string;
  updated_at: string;
  messages: TicketMessage[];
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_type: 'user' | 'admin';
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
  specifications: any;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface Provider {
  id: string;
  name: string;
  type: 'linode' | 'digitalocean' | 'aws' | 'gcp';
  api_key_encrypted?: string;
  configuration?: any;
  active: boolean;
  created_at: string;
  updated_at: string;
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
  type_class: string;
}

interface LinodeRegion {
  id: string;
  label: string;
  country: string;
  capabilities: string[];
  status: string;
}

const API_BASE_URL = '/api';

const Admin: React.FC = () => {
  const { token } = useAuth();
  const { themeId, setTheme, themes } = useTheme();
  const [activeTab, setActiveTab] = useState<'tickets' | 'plans' | 'containers' | 'providers' | 'stackscripts' | 'networking' | 'theme'>('tickets');
  const [, setLoading] = useState(false);

  // Tickets state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [deleteTicketId, setDeleteTicketId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Plans state
  const [plans, setPlans] = useState<VPSPlan[]>([]);
  const [editPlanId, setEditPlanId] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState<Partial<VPSPlan>>({});
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PricingConfig>({ price_per_cpu: 0, price_per_ram_gb: 0, price_per_storage_gb: 0, price_per_network_mbps: 0, currency: 'USD' });
  const [containerPlans, setContainerPlans] = useState<ContainerPlan[]>([]);
  const [newContainerPlan, setNewContainerPlan] = useState<Partial<ContainerPlan>>({ name: '', cpu_cores: 1, ram_gb: 1, storage_gb: 10, network_mbps: 0, base_price: 0, markup_price: 0, active: true });
  const [editContainerPlanId, setEditContainerPlanId] = useState<string | null>(null);
  const [editContainerPlan, setEditContainerPlan] = useState<Partial<ContainerPlan>>({});
  const [deleteContainerPlanId, setDeleteContainerPlanId] = useState<string | null>(null);
  
  // Compute container plan price based on pricing configuration
  const computeContainerPlanPrice = (plan: ContainerPlan) => {
    const cpuPrice = (plan.cpu_cores || 0) * (pricing.price_per_cpu || 0);
    const ramPrice = (plan.ram_gb || 0) * (pricing.price_per_ram_gb || 0);
    const storagePrice = (plan.storage_gb || 0) * (pricing.price_per_storage_gb || 0);
    const networkPrice = (plan.network_mbps || 0) * (pricing.price_per_network_mbps || 0);
    return cpuPrice + ramPrice + storagePrice + networkPrice;
  };
  
  // Linode VPS state
  const [linodeTypes, setLinodeTypes] = useState<LinodeType[]>([]);
  const [linodeRegions, setLinodeRegions] = useState<LinodeRegion[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [showAddVPSPlan, setShowAddVPSPlan] = useState(false);
  const [newVPSPlan, setNewVPSPlan] = useState({
    name: '',
    selectedType: '',
    selectedRegion: '',
    markupPrice: 0,
    active: true
  });
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [newProvider, setNewProvider] = useState({
    name: '',
    type: '',
    apiKey: '',
    active: true
  });
  const [editProviderId, setEditProviderId] = useState<string | null>(null);
  const [editProvider, setEditProvider] = useState<Partial<Provider>>({});
  const [deleteProviderId, setDeleteProviderId] = useState<string | null>(null);
  const [stackscriptConfigs, setStackscriptConfigs] = useState<StackscriptConfigRecord[]>([]);
  const [availableStackscripts, setAvailableStackscripts] = useState<LinodeStackScriptSummary[]>([]);
  const [stackscriptDrafts, setStackscriptDrafts] = useState<Record<number, { label: string; description: string; display_order: number; is_enabled: boolean }>>({});
  const [stackscriptSearch, setStackscriptSearch] = useState('');
  const [savingStackscriptId, setSavingStackscriptId] = useState<number | null>(null);
  const [loadingStackscripts, setLoadingStackscripts] = useState(false);

  // Networking rDNS state
  const [networkingTab, setNetworkingTab] = useState<'rdns'>('rdns');
  const [rdnsBaseDomain, setRdnsBaseDomain] = useState<string>('');
  const [rdnsLoading, setRdnsLoading] = useState<boolean>(false);
  const [rdnsSaving, setRdnsSaving] = useState<boolean>(false);

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  // Allowed regions strictly from admin provider configuration
  const allowedRegionIds = useMemo(() => {
    const linodeProvider = providers.find(p => p.type === 'linode' && p.active);
    const list = (linodeProvider && linodeProvider.configuration && Array.isArray(linodeProvider.configuration.allowed_regions))
      ? linodeProvider.configuration.allowed_regions as string[]
      : [];
    return list;
  }, [providers]);

  const allowedLinodeRegions = useMemo(() => {
    // If admin hasn't configured allowed regions, fall back to all regions from Linode API
    if (!allowedRegionIds || allowedRegionIds.length === 0) return linodeRegions;
    const set = new Set(allowedRegionIds);
    return linodeRegions.filter(r => set.has(r.id));
  }, [linodeRegions, allowedRegionIds]);

  const sortedStackscriptConfigs = useMemo(() => {
    if (stackscriptConfigs.length === 0) return [] as StackscriptConfigRecord[];
    return [...stackscriptConfigs].sort((a, b) => {
      const orderA = typeof a.display_order === 'number' ? a.display_order : Number(a.display_order) || 0;
      const orderB = typeof b.display_order === 'number' ? b.display_order : Number(b.display_order) || 0;
      if (orderA !== orderB) return orderA - orderB;
      const labelA = (a.label || a.script?.label || '').toLowerCase();
      const labelB = (b.label || b.script?.label || '').toLowerCase();
      return labelA.localeCompare(labelB);
    });
  }, [stackscriptConfigs]);

  const filteredAvailableStackscripts = useMemo(() => {
    const configuredIds = new Set(sortedStackscriptConfigs.map(cfg => cfg.stackscript_id));
    const searchTerm = stackscriptSearch.trim().toLowerCase();
    return availableStackscripts
      .filter(script => !configuredIds.has(script.id))
      .filter(script => {
        if (!searchTerm) return true;
        const haystack = `${script.label} ${script.description ?? ''} ${script.rev_note ?? ''}`.toLowerCase();
        return haystack.includes(searchTerm);
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [availableStackscripts, sortedStackscriptConfigs, stackscriptSearch]);

  useEffect(() => {
    if (!token) {
      return;
    }

    switch (activeTab) {
      case 'tickets':
        fetchTickets();
        break;
      case 'plans':
        fetchPlans();
        fetchProviders();
        fetchLinodeTypes();
        fetchLinodeRegions();
        break;
      case 'stackscripts':
        fetchStackscriptConfigs();
        break;
      case 'providers':
        fetchProviders();
        break;
      case 'networking':
        fetchNetworkingRdns();
        break;
      case 'theme':
        break;
      case 'containers':
      default:
        fetchPricing();
        fetchContainerPlans();
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, token]);

  const fetchTickets = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/tickets`, { headers: authHeader });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load tickets');
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
      const res = await fetch(`${API_BASE_URL}/admin/tickets/${ticket.id}/replies`, { headers: authHeader });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load replies');
      const msgs: TicketMessage[] = (data.replies || []).map((m: any) => ({
        id: m.id,
        ticket_id: m.ticket_id,
        sender_type: m.sender_type,
        sender_name: m.sender_name,
        message: m.message,
        created_at: m.created_at,
      }));
      setSelectedTicket(prev => (prev ? { ...prev, messages: msgs } : prev));
      setTimeout(scrollToBottom, 100);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load replies');
    }
  };

  const fetchProviders = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/providers`, { headers: authHeader });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load providers');
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
      const res = await fetch(`${API_BASE_URL}/admin/networking/rdns`, { headers: authHeader });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load rDNS configuration');
      const base = (data.config?.rdns_base_domain ?? 'ip.rev.skyvps360.xyz') as string;
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
      toast.error('Please enter a base domain');
      return;
    }
    setRdnsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/networking/rdns`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ rdns_base_domain: rdnsBaseDomain.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save rDNS configuration');
      setRdnsBaseDomain(data.config?.rdns_base_domain ?? rdnsBaseDomain.trim());
      toast.success('rDNS configuration updated');
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
      const configRes = await fetch(`${API_BASE_URL}/admin/stackscripts/configs`, { headers: authHeader });
      const configData = await configRes.json();
      if (!configRes.ok) throw new Error(configData.error || 'Failed to load StackScript configs');
      
      // Fetch available stackscripts
      const scriptRes = await fetch(`${API_BASE_URL}/admin/linode/stackscripts?mine=true`, { headers: authHeader });
      const scriptData = await scriptRes.json();
      if (!scriptRes.ok) throw new Error(scriptData.error || 'Failed to load StackScripts');
      
      const configured: StackscriptConfigRecord[] = Array.isArray(configData.configs) ? configData.configs : [];
      const available: LinodeStackScriptSummary[] = Array.isArray(scriptData.stackscripts) ? scriptData.stackscripts : [];
      
      setStackscriptConfigs(configured);
      setAvailableStackscripts(available);
      
      const drafts: Record<number, { label: string; description: string; display_order: number; is_enabled: boolean }> = {};
      configured.forEach(cfg => {
        const script = available.find(item => item.id === cfg.stackscript_id) || null;
        drafts[cfg.stackscript_id] = {
          label: cfg.label ?? script?.label ?? '',
          description: cfg.description ?? script?.description ?? script?.rev_note ?? '',
          display_order: typeof cfg.display_order === 'number' ? cfg.display_order : Number(cfg.display_order) || 0,
          is_enabled: cfg.is_enabled !== false,
        };
      });
      setStackscriptDrafts(drafts);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load StackScripts');
    } finally {
      setLoadingStackscripts(false);
    }
  };

  const fetchStackscriptsAndConfigs = async () => {
    await fetchStackscriptConfigs();
  };

  const saveStackscriptConfig = async (stackscriptId: number, draft: { label: string; description: string; display_order: number; is_enabled: boolean }) => {
    try {
      setSavingStackscriptId(stackscriptId);
      const res = await fetch(`${API_BASE_URL}/admin/stackscripts/configs`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stackscript_id: stackscriptId,
          label: draft.label,
          description: draft.description,
          is_enabled: draft.is_enabled,
          display_order: draft.display_order,
          metadata: {}
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save StackScript config');
      toast.success('StackScript configuration saved');
      await fetchStackscriptConfigs();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save StackScript config');
    } finally {
      setSavingStackscriptId(null);
    }
  };

  const handleAddStackscript = async (script: LinodeStackScriptSummary) => {
    try {
      setSavingStackscriptId(script.id);
      const res = await fetch(`${API_BASE_URL}/admin/linode/stackscripts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          stackscript_id: script.id,
          label: script.label,
          description: script.description || script.rev_note || '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to add StackScript');
      toast.success('StackScript added');
      await fetchStackscriptConfigs();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add StackScript');
    } finally {
      setSavingStackscriptId(null);
    }
  };

  const handleSaveStackscript = async (stackscriptId: number) => {
    const draft = stackscriptDrafts[stackscriptId];
    if (!draft) return;
    try {
      setSavingStackscriptId(stackscriptId);
      const res = await fetch(`${API_BASE_URL}/admin/linode/stackscripts/${stackscriptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          label: draft.label,
          description: draft.description,
          display_order: draft.display_order,
          is_enabled: draft.is_enabled,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update StackScript');
      toast.success('StackScript updated');
      await fetchStackscriptConfigs();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update StackScript');
    } finally {
      setSavingStackscriptId(null);
    }
  };

  const handleRemoveStackscript = async (stackscriptId: number) => {
    try {
      setSavingStackscriptId(stackscriptId);
      const res = await fetch(`${API_BASE_URL}/admin/linode/stackscripts/${stackscriptId}`, {
        method: 'DELETE',
        headers: authHeader,
      });
      if (res.status === 404) {
        toast.error('StackScript configuration not found');
        return;
      }
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to remove StackScript');
      }
      toast.success('StackScript removed');
      await fetchStackscriptConfigs();
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove StackScript');
    } finally {
      setSavingStackscriptId(null);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: TicketStatus) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update ticket');
      setTickets(prev => prev.map(t => (t.id === ticketId ? data.ticket : t)));
      if (selectedTicket && selectedTicket.id === ticketId) setSelectedTicket(data.ticket);
      toast.success('Ticket status updated');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const sendReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/tickets/${selectedTicket.id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ message: replyMessage.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reply');
      const reply: TicketMessage = {
        id: data.reply.id,
        ticket_id: data.reply.ticket_id,
        sender_type: 'admin',
        sender_name: 'Staff Member',
        message: data.reply.message,
        created_at: data.reply.created_at,
      };
      setSelectedTicket(prev => (prev ? { ...prev, messages: [...prev.messages, reply] } : prev));
      setReplyMessage('');
      toast.success('Reply sent');
      setTimeout(scrollToBottom, 100);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const fetchPlans = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/plans`, { headers: authHeader });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load plans');
      setPlans(data.plans);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchLinodeTypes = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/linode/plans`, { headers: authHeader });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load Linode types');
      setLinodeTypes(data.plans);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const fetchLinodeRegions = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/linode/regions`, { headers: authHeader });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load Linode regions');
      setLinodeRegions(data.regions);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const fetchPricing = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/container/pricing`, { headers: authHeader });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load pricing');
      setPricing(data.pricing ?? { price_per_cpu: 0, price_per_ram_gb: 0, price_per_storage_gb: 0, price_per_network_mbps: 0, currency: 'USD' });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const savePricing = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/container/pricing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(pricing),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save pricing');
      setPricing(data.pricing);
      toast.success('Container pricing updated');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const fetchContainerPlans = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/container/plans`, { headers: authHeader });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load container plans');
      setContainerPlans(data.plans);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const createContainerPlan = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/container/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(newContainerPlan),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create plan');
      setContainerPlans(prev => [data.plan, ...prev]);
      setNewContainerPlan({ name: '', cpu_cores: 1, ram_gb: 1, storage_gb: 10, network_mbps: 0, base_price: 0, markup_price: 0, active: true });
      toast.success('Container plan created');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const savePlan = async () => {
    if (!editPlanId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/plans/${editPlanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          name: editPlan.name,
          base_price: editPlan.base_price,
          markup_price: editPlan.markup_price,
          active: editPlan.active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update plan');
      setPlans(prev => prev.map(p => (p.id === editPlanId ? data.plan : p)));
      setEditPlanId(null);
      setEditPlan({});
      toast.success('Plan updated');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const createVPSPlan = async () => {
    if (!newVPSPlan.selectedType || !newVPSPlan.selectedRegion) {
      toast.error('Please select both a plan type and region');
      return;
    }

    const selectedType = linodeTypes.find(t => t.id === newVPSPlan.selectedType);
    if (!selectedType) {
      toast.error('Selected plan type not found');
      return;
    }

    const linodeProvider = providers.find(p => p.type === 'linode' && p.active);
    if (!linodeProvider) {
      toast.error('No Linode provider configured. Please add one first.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/admin/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          provider_id: linodeProvider.id,
          name: (newVPSPlan.name && newVPSPlan.name.trim().length > 0)
            ? newVPSPlan.name.trim()
            : `${selectedType.label} - ${newVPSPlan.selectedRegion}`,
          provider_plan_id: selectedType.id,
          base_price: selectedType.price.monthly,
          markup_price: newVPSPlan.markupPrice,
          specifications: {
            vcpus: selectedType.vcpus,
            memory: selectedType.memory,
            disk: selectedType.disk,
            transfer: selectedType.transfer,
            region: newVPSPlan.selectedRegion,
            type_class: selectedType.type_class
          },
          active: newVPSPlan.active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create VPS plan');
      setPlans(prev => [data.plan, ...prev]);
      setNewVPSPlan({
        name: '',
        selectedType: '',
        selectedRegion: '',
        markupPrice: 0,
        active: true
      });
      setShowAddVPSPlan(false);
      toast.success('VPS plan created successfully');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const createProvider = async () => {
    if (!newProvider.name || !newProvider.type || !newProvider.apiKey) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/admin/providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          name: newProvider.name,
          type: newProvider.type,
          apiKey: newProvider.apiKey,
          active: newProvider.active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create provider');
      setProviders(prev => [data.provider, ...prev]);
      setNewProvider({
        name: '',
        type: '',
        apiKey: '',
        active: true
      });
      setShowAddProvider(false);
      toast.success('Provider added successfully');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Delete ticket
  const deleteTicket = async (ticketId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/tickets/${ticketId}`, {
        method: 'DELETE',
        headers: authHeader,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete ticket');
      }
      setTickets(tickets.filter(t => t.id !== ticketId));
      if (selectedTicket?.id === ticketId) setSelectedTicket(null);
      setDeleteTicketId(null);
      toast.success('Ticket deleted');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Close ticket
  const closeTicket = async (ticketId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ status: 'closed' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to close ticket');
      setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: 'closed' } : t));
      if (selectedTicket?.id === ticketId) setSelectedTicket({ ...selectedTicket, status: 'closed' });
      toast.success('Ticket closed');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Delete VPS plan
  const deleteVPSPlan = async (planId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/plans/${planId}`, {
        method: 'DELETE',
        headers: authHeader,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete plan');
      }
      setPlans(plans.filter(p => p.id !== planId));
      setDeletePlanId(null);
      toast.success('VPS plan deleted');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Update container plan
  const updateContainerPlan = async () => {
    if (!editContainerPlanId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/container/plans/${editContainerPlanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(editContainerPlan),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update container plan');
      setContainerPlans(containerPlans.map(p => p.id === editContainerPlanId ? data.plan : p));
      setEditContainerPlanId(null);
      setEditContainerPlan({});
      toast.success('Container plan updated');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Delete container plan
  const deleteContainerPlan = async (planId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/container/plans/${planId}`, {
        method: 'DELETE',
        headers: authHeader,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete container plan');
      }
      setContainerPlans(containerPlans.filter(p => p.id !== planId));
      setDeleteContainerPlanId(null);
      toast.success('Container plan deleted');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Update provider
  const updateProvider = async () => {
    if (!editProviderId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/providers/${editProviderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(editProvider),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update provider');
      setProviders(providers.map(p => p.id === editProviderId ? data.provider : p));
      setEditProviderId(null);
      setEditProvider({});
      toast.success('Provider updated');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Delete provider
  const deleteProvider = async (providerId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/providers/${providerId}`, {
        method: 'DELETE',
        headers: authHeader,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete provider');
      }
      setProviders(providers.filter(p => p.id !== providerId));
      setDeleteProviderId(null);
      toast.success('Provider deleted');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filteredTickets = tickets.filter(t => (statusFilter === 'all' ? true : t.status === statusFilter));

  return (
    <div className="space-y-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage support tickets and VPS plans</p>
          </div>
          <Settings className="h-6 w-6 text-gray-400 " />
        </div>

        <div className="mb-6 border-b border">
          <nav className="-mb-px flex flex-wrap gap-x-6 gap-y-2" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('tickets')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'tickets' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <Ticket className="h-4 w-4 inline mr-2" /> Tickets
            </button>
            <button
              onClick={() => setActiveTab('plans')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'plans' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <DollarSign className="h-4 w-4 inline mr-2" /> VPS Plans
            </button>
            <button
              onClick={() => setActiveTab('stackscripts')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'stackscripts' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <FileCode className="h-4 w-4 inline mr-2" /> StackScripts
            </button>
            <button
              onClick={() => setActiveTab('containers')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'containers' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <Server className="h-4 w-4 inline mr-2" /> Container Plans
            </button>
            <button
              onClick={() => setActiveTab('networking')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'networking' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <Globe className="h-4 w-4 inline mr-2" /> Networking
            </button>
            <button
              onClick={() => setActiveTab('providers')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'providers' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <Settings className="h-4 w-4 inline mr-2" /> Providers
            </button>
            <button
              onClick={() => setActiveTab('theme')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'theme' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <Palette className="h-4 w-4 inline mr-2" /> Theme
            </button>
          </nav>
        </div>

        {activeTab === 'theme' && (
          <div className="bg-card shadow sm:rounded-lg">
            <div className="px-6 py-4 border-b border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Palette className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h2 className="text-lg font-medium text-foreground">Theme Manager</h2>
                  <p className="text-sm text-muted-foreground">Switch between shadcn presets and preview brand colors.</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {themes.map((preset) => {
                  const isActive = preset.id === themeId;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setTheme(preset.id)}
                      className={`relative w-full rounded-lg border p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-opacity-40 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                        isActive ? 'border-primary ring-2 ring-primary ring-opacity-20' : 'border-border hover:border-primary'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{preset.label}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{preset.description}</p>
                        </div>
                        <Badge variant={isActive ? 'default' : 'outline'}>
                          {isActive ? 'Active' : 'Preview'}
                        </Badge>
                      </div>
                      <div className="mt-4 flex gap-4">
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          <span>Primary</span>
                          <span
                            className="h-10 w-10 rounded-md border shadow-sm"
                            style={{ backgroundColor: `hsl(${preset.light.primary})` }}
                          />
                        </div>
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          <span>Surface</span>
                          <span
                            className="h-10 w-10 rounded-md border shadow-sm"
                            style={{ backgroundColor: `hsl(${preset.light.background})` }}
                          />
                        </div>
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          <span>Dark Primary</span>
                          <span
                            className="h-10 w-10 rounded-md border shadow-sm"
                            style={{ backgroundColor: `hsl(${preset.dark.primary})` }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                Theme changes apply instantly on this device. Additional presets can be added later to extend the open-source theme system.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="bg-card shadow sm:rounded-lg">
            <div className="px-6 py-4 border-b border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ClipboardList className="h-5 w-5 text-gray-400 " />
                <h2 className="text-lg font-medium text-foreground">Support Tickets</h2>
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="rounded-md border bg-secondary text-foreground shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <ul className="divide-y divide-border">
                    {filteredTickets.length === 0 ? (
                      <li className="px-4 py-10 text-center text-muted-foreground">No tickets found</li>
                    ) : (
                      filteredTickets.map(t => (
                        <li key={t.id}>
                          <button
                            className="w-full text-left px-4 py-3 hover:bg-secondary/80"
                            onClick={() => openTicket(t)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-foreground">{t.subject}</div>
                                <div className="text-sm text-muted-foreground">{t.category} • {new Date(t.created_at).toLocaleString()}</div>
                              </div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                t.status === 'open' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                                t.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                                t.status === 'resolved' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-secondary '
                              }`}>
                                {t.status.replace('_', ' ')}
                              </span>
                            </div>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div>
                  {!selectedTicket ? (
                    <div className="px-4 py-10 text-center text-muted-foreground">
                      Select a ticket to view details
                    </div>
                  ) : (
                    <div className="border border rounded-md">
                      <div className="px-4 py-3 border-b border">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-lg font-semibold text-foreground">{selectedTicket.subject}</div>
                            <div className="text-sm text-muted-foreground">{selectedTicket.category}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedTicket.status !== 'open' && (
                              <button
                                className="inline-flex items-center px-3 py-1 rounded-md text-sm border border-green-300 dark:border-green-600 bg-secondary text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900"
                                onClick={() => updateTicketStatus(selectedTicket.id, 'open')}
                              >
                                <RefreshCw className="h-4 w-4 mr-1" /> Re-open
                              </button>
                            )}
                            <button
                              className="inline-flex items-center px-3 py-1 rounded-md text-sm border border bg-secondary text-foreground hover:bg-secondary/80"
                              onClick={() => updateTicketStatus(selectedTicket.id, 'in_progress')}
                            >
                              <AlertCircle className="h-4 w-4 mr-1" /> In Progress
                            </button>
                            <button
                              className="inline-flex items-center px-3 py-1 rounded-md text-sm border border bg-secondary text-foreground hover:bg-secondary/80"
                              onClick={() => updateTicketStatus(selectedTicket.id, 'resolved')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" /> Resolve
                            </button>
                            <button
                              className="inline-flex items-center px-3 py-1 rounded-md text-sm border border bg-secondary text-foreground hover:bg-secondary/80"
                              onClick={() => closeTicket(selectedTicket.id)}
                            >
                              <X className="h-4 w-4 mr-1" /> Close
                            </button>
                            <button
                              className="inline-flex items-center px-3 py-1 rounded-md text-sm border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 bg-secondary hover:bg-red-50 dark:hover:bg-red-900"
                              onClick={() => setDeleteTicketId(selectedTicket.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="px-4 py-3 space-y-3">
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedTicket.message}</div>
                        {/* Replies thread */}
                        <div className="max-h-96 overflow-y-auto">
                          <div className="space-y-3">
                            {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                              selectedTicket.messages.map((m) => (
                                <div key={m.id} className={`flex ${m.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`${m.sender_type === 'admin' ? 'bg-blue-600 text-white' : 'bg-secondary text-foreground'} max-w-xs lg:max-w-md px-3 py-2 rounded-lg`}>
                                    <div className="text-xs opacity-80 mb-1">
                                      <span className="font-medium mr-2">{m.sender_name}</span>
                                      <span>{new Date(m.created_at).toLocaleString()}</span>
                                    </div>
                                    <div className="text-sm whitespace-pre-wrap">{m.message}</div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-muted-foreground">No replies yet</div>
                            )}
                            {/* Auto-scroll anchor */}
                            <div ref={messagesEndRef} />
                          </div>
                        </div>
                        <div className="pt-3 border-t border">
                          <label className="block text-sm font-medium text-muted-foreground mb-1">Reply</label>
                          <textarea
                            className="w-full rounded-md border bg-secondary text-foreground shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                            rows={3}
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            placeholder="Type your response to the client"
                          />
                          <div className="mt-2">
                            <button
                              onClick={sendReply}
                              disabled={!replyMessage.trim()}
                              className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
                            >
                              Send Reply
                            </button>
                            <button
                              onClick={() => setSelectedTicket(null)}
                              className="ml-2 inline-flex items-center px-4 py-2 rounded-md text-sm border border bg-secondary text-foreground hover:bg-secondary/80"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'plans' && (
          <div className="bg-card shadow sm:rounded-lg">
            <div className="px-6 py-4 border-b border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-gray-400 " />
                <h2 className="text-lg font-medium text-foreground">VPS Plans</h2>
              </div>
              <button
                onClick={() => setShowAddVPSPlan(true)}
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New VPS Plan
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Provider Plan ID</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Base Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Markup Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Active</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {plans.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No plans available</td>
                      </tr>
                    ) : (
                      plans.map(plan => (
                        <tr key={plan.id}>
                          <td className="px-4 py-2">
                            {editPlanId === plan.id ? (
                              <input
                                type="text"
                                className="w-64 rounded-md border bg-secondary text-foreground shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                                value={(editPlan.name as string | undefined) ?? plan.name}
                                onChange={(e) => setEditPlan(prev => ({ ...prev, name: e.target.value }))}
                              />
                            ) : (
                              <span className="text-sm text-foreground">{plan.name}</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-muted-foreground">{plan.provider_plan_id}</td>
                          <td className="px-4 py-2">
                            {editPlanId === plan.id ? (
                              <input
                                type="number"
                                step="0.01"
                                className="w-28 rounded-md border bg-secondary text-foreground shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                                value={editPlan.base_price as number | undefined ?? plan.base_price}
                                onChange={(e) => setEditPlan(prev => ({ ...prev, base_price: parseFloat(e.target.value) }))}
                              />
                            ) : (
                              <span className="text-sm text-muted-foreground">${Number(plan.base_price).toFixed(2)}</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {editPlanId === plan.id ? (
                              <input
                                type="number"
                                step="0.01"
                                className="w-28 rounded-md border bg-secondary text-foreground shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                                value={editPlan.markup_price as number | undefined ?? plan.markup_price}
                                onChange={(e) => setEditPlan(prev => ({ ...prev, markup_price: parseFloat(e.target.value) }))}
                              />
                            ) : (
                              <span className="text-sm text-muted-foreground">${Number(plan.markup_price).toFixed(2)}</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {editPlanId === plan.id ? (
                              <select
                                className="rounded-md border bg-secondary text-foreground shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                                value={(editPlan.active as boolean | undefined ?? plan.active) ? 'true' : 'false'}
                                onChange={(e) => setEditPlan(prev => ({ ...prev, active: e.target.value === 'true' }))}
                              >
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                              </select>
                            ) : (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${plan.active ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-secondary '}`}>
                                {plan.active ? 'Active' : 'Inactive'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {editPlanId === plan.id ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={savePlan}
                                  className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => { setEditPlanId(null); setEditPlan({}); }}
                                  className="inline-flex items-center px-3 py-1 rounded-md text-sm border border bg-secondary text-foreground hover:bg-secondary/80"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => { setEditPlanId(plan.id); setEditPlan({ name: plan.name, base_price: plan.base_price, markup_price: plan.markup_price, active: plan.active }); }}
                                  className="inline-flex items-center px-3 py-1 rounded-md text-sm border border bg-secondary text-foreground hover:bg-secondary/80"
                                >
                                  <Edit className="h-4 w-4 mr-1" /> Edit
                                </button>
                                <button
                                  onClick={() => setDeletePlanId(plan.id)}
                                  className="inline-flex items-center px-3 py-1 rounded-md text-sm border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 bg-secondary hover:bg-red-50 dark:hover:bg-red-900"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Add New VPS Plan Modal */}
              {showAddVPSPlan && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                  <div className="relative top-20 mx-auto p-5 border border w-96 shadow-lg rounded-md bg-card">
                    <div className="mt-3">
                      <h3 className="text-lg font-medium text-foreground mb-4">Add New VPS Plan</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-1">
                            Name
                          </label>
                          <input
                            type="text"
                            value={newVPSPlan.name}
                            onChange={(e) => setNewVPSPlan(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full rounded-md border bg-secondary text-foreground shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                            placeholder="e.g. US-East 4GB Standard"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-1">
                            Linode Plan Type
                          </label>
                          <select
                            value={newVPSPlan.selectedType}
                            onChange={(e) => setNewVPSPlan(prev => ({ ...prev, selectedType: e.target.value }))}
                            className="w-full rounded-md border bg-secondary text-foreground shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                          >
                            <option value="">Select a plan type</option>
                            {linodeTypes.map(type => (
                              <option key={type.id} value={type.id}>
                                {type.label} - {type.vcpus} vCPUs, {type.memory}MB RAM, {Math.round(type.disk / 1024)}GB Storage - ${type.price.monthly}/mo
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-1">
                            Region
                          </label>
                          <select
                            value={newVPSPlan.selectedRegion}
                            onChange={(e) => setNewVPSPlan(prev => ({ ...prev, selectedRegion: e.target.value }))}
                            className="w-full rounded-md border bg-secondary text-foreground shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                            disabled={allowedLinodeRegions.length === 0}
                          >
                            <option value="">Select a region</option>
                            {allowedLinodeRegions.map(region => (
                              <option key={region.id} value={region.id}>
                                {region.label} ({region.country})
                              </option>
                            ))}
                          </select>
                          {allowedLinodeRegions.length === 0 && (
                            <p className="mt-1 text-sm text-muted-foreground">No regions available. Check Linode API token or network.</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-1">
                            Markup Price (USD)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={newVPSPlan.markupPrice}
                            onChange={(e) => setNewVPSPlan(prev => ({ ...prev, markupPrice: parseFloat(e.target.value) || 0 }))}
                            className="w-full rounded-md border bg-secondary text-foreground shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                            placeholder="0.00"
                          />
                        </div>
                        
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="active"
                            checked={newVPSPlan.active}
                            onChange={(e) => setNewVPSPlan(prev => ({ ...prev, active: e.target.checked }))}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border rounded"
                          />
                          <label htmlFor="active" className="ml-2 block text-sm text-foreground">
                            Active
                          </label>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-end gap-3 mt-6">
                        <button
                          onClick={() => {
                            setShowAddVPSPlan(false);
                            setNewVPSPlan({
                              name: '',
                              selectedType: '',
                              selectedRegion: '',
                              markupPrice: 0,
                              active: true
                            });
                          }}
                          className="px-4 py-2 text-sm font-medium text-muted-foreground bg-secondary border border rounded-md hover:bg-secondary/80"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={createVPSPlan}
                          disabled={!newVPSPlan.selectedType || !newVPSPlan.selectedRegion}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 border border-transparent rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Create Plan
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'stackscripts' && (
          <div className="bg-card shadow sm:rounded-lg">
            <div className="px-6 py-4 border-b border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileCode className="h-5 w-5 text-gray-400 " />
                <h2 className="text-lg font-medium text-foreground">Manage StackScripts</h2>
              </div>
              <button
                onClick={fetchStackscriptsAndConfigs}
                className="px-3 py-1.5 text-sm font-medium text-muted-foreground bg-secondary border border rounded-md hover:bg-secondary/80"
              >
                <RefreshCw className="h-4 w-4 inline mr-1" /> Refresh
              </button>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Configure which Linode StackScripts appear on the VPS creation page. Only enabled scripts will be shown to users.
              </p>
              
              {/* Search filter */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search StackScripts..."
                  value={stackscriptSearch}
                  onChange={(e) => setStackscriptSearch(e.target.value)}
                  className="w-full px-3 py-2 border border rounded-md bg-secondary text-foreground"
                />
              </div>

              <div className="space-y-3">
                {availableStackscripts
                  .filter(s => !stackscriptSearch || s.label.toLowerCase().includes(stackscriptSearch.toLowerCase()))
                  .map(script => {
                    const config = stackscriptConfigs.find(c => c.stackscript_id === script.id);
                    const draft = stackscriptDrafts[script.id] || {
                      label: config?.label || script.label,
                      description: config?.description || script.description || '',
                      display_order: config?.display_order ?? 0,
                      is_enabled: config?.is_enabled ?? false
                    };
                    const hasChanges = config && (
                      draft.label !== (config.label || script.label) ||
                      draft.description !== (config.description || '') ||
                      draft.display_order !== config.display_order ||
                      draft.is_enabled !== config.is_enabled
                    );
                    const isNew = !config;

                    return (
                      <div key={script.id} className="border border rounded-lg p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                          {/* Checkbox and badge */}
                          <div className="lg:col-span-1 flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={draft.is_enabled}
                              onChange={(e) => {
                                const updated = { ...draft, is_enabled: e.target.checked };
                                setStackscriptDrafts(prev => ({ ...prev, [script.id]: updated }));
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            {draft.is_enabled && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                Enabled
                              </span>
                            )}
                          </div>

                          {/* Script info and inputs */}
                          <div className="lg:col-span-9 space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">Display Label</label>
                              <input
                                type="text"
                                value={draft.label}
                                onChange={(e) => {
                                  const updated = { ...draft, label: e.target.value };
                                  setStackscriptDrafts(prev => ({ ...prev, [script.id]: updated }));
                                }}
                                placeholder={script.label}
                                className="w-full px-3 py-1.5 text-sm border border rounded-md bg-secondary text-foreground"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                              <input
                                type="text"
                                value={draft.description}
                                onChange={(e) => {
                                  const updated = { ...draft, description: e.target.value };
                                  setStackscriptDrafts(prev => ({ ...prev, [script.id]: updated }));
                                }}
                                placeholder={script.description || 'No description'}
                                className="w-full px-3 py-1.5 text-sm border border rounded-md bg-secondary text-foreground"
                              />
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ID: {script.id} • Images: {script.images?.map((img: string) => img.replace(/^linode\//i, '')).join(', ') || 'Any'}
                            </div>
                          </div>

                          {/* Display order and save button */}
                          <div className="lg:col-span-2 flex flex-col gap-2">
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">Order</label>
                              <input
                                type="number"
                                value={draft.display_order}
                                onChange={(e) => {
                                  const updated = { ...draft, display_order: Number(e.target.value) };
                                  setStackscriptDrafts(prev => ({ ...prev, [script.id]: updated }));
                                }}
                                className="w-full px-2 py-1 text-sm border border rounded-md bg-secondary text-foreground"
                              />
                            </div>
                            <button
                              onClick={() => saveStackscriptConfig(script.id, draft)}
                              disabled={savingStackscriptId === script.id || (!hasChanges && !isNew)}
                              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                                hasChanges || isNew
                                  ? 'text-white bg-primary hover:bg-primary/90'
                                  : 'text-gray-400 bg-muted cursor-not-allowed'
                              }`}
                            >
                              {savingStackscriptId === script.id ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'containers' && (
          <div className="bg-card shadow sm:rounded-lg">
            <div className="px-6 py-4 border-b border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-gray-400 " />
                <h2 className="text-lg font-medium text-foreground">Container Pricing & Plans</h2>
              </div>
            </div>
            <div className="px-6 py-4 space-y-6">
              <div>
                <h3 className="text-md font-medium text-foreground mb-3">Pricing Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Per CPU</label>
                    <input type="number" step="0.01" className="w-full rounded-md border bg-secondary text-foreground" value={pricing.price_per_cpu}
                      onChange={e => setPricing(p => ({ ...p, price_per_cpu: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Per RAM GB</label>
                    <input type="number" step="0.01" className="w-full rounded-md border bg-secondary text-foreground" value={pricing.price_per_ram_gb}
                      onChange={e => setPricing(p => ({ ...p, price_per_ram_gb: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Per Storage GB</label>
                    <input type="number" step="0.01" className="w-full rounded-md border bg-secondary text-foreground" value={pricing.price_per_storage_gb}
                      onChange={e => setPricing(p => ({ ...p, price_per_storage_gb: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Per Mbps</label>
                    <input type="number" step="0.01" className="w-full rounded-md border bg-secondary text-foreground" value={pricing.price_per_network_mbps}
                      onChange={e => setPricing(p => ({ ...p, price_per_network_mbps: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Currency</label>
                    <input className="w-full rounded-md border bg-secondary text-foreground" value={pricing.currency}
                      onChange={e => setPricing(p => ({ ...p, currency: e.target.value }))} />
                  </div>
                </div>
                <div className="mt-3">
                  <button className="inline-flex items-center px-3 py-1 rounded-md text-sm border border bg-secondary text-foreground hover:bg-secondary/80" onClick={savePricing}>Save Pricing</button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-md font-medium text-foreground">Container Plans</h3>
                </div>
                <div className="border border rounded-md p-4 bg-muted mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Name</label>
                      <input className="w-full rounded-md border bg-card text-foreground" placeholder="Plan name" value={newContainerPlan.name as string}
                        onChange={e => setNewContainerPlan(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">CPU Cores</label>
                      <input type="number" min={1} className="w-full rounded-md border bg-card text-foreground" placeholder="1" value={newContainerPlan.cpu_cores as number}
                        onChange={e => setNewContainerPlan(p => ({ ...p, cpu_cores: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">RAM (GB)</label>
                      <input type="number" min={1} className="w-full rounded-md border bg-card text-foreground" placeholder="1" value={newContainerPlan.ram_gb as number}
                        onChange={e => setNewContainerPlan(p => ({ ...p, ram_gb: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Storage (GB)</label>
                      <input type="number" min={1} className="w-full rounded-md border bg-card text-foreground" placeholder="10" value={newContainerPlan.storage_gb as number}
                        onChange={e => setNewContainerPlan(p => ({ ...p, storage_gb: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">Network (Mbps)</label>
                      <input type="number" min={0} className="w-full rounded-md border bg-card text-foreground" placeholder="0" value={newContainerPlan.network_mbps as number}
                        onChange={e => setNewContainerPlan(p => ({ ...p, network_mbps: Number(e.target.value) }))} />
                    </div>
                    <div className="flex items-end">
                      <button className="w-full inline-flex items-center justify-center px-3 py-2 rounded-md text-sm border border bg-card text-foreground hover:bg-secondary/80" onClick={createContainerPlan}>
                        <Plus className="h-4 w-4 mr-1" /> Add Plan
                      </button>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">CPU</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">RAM</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Storage</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Network</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Active</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {containerPlans.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No container plans</td>
                        </tr>
                      ) : (
                        containerPlans.map(p => (
                          <tr key={p.id}>
                            <td className="px-4 py-2 text-sm text-foreground">{p.name}</td>
                            <td className="px-4 py-2 text-sm text-muted-foreground">{p.cpu_cores}</td>
                            <td className="px-4 py-2 text-sm text-muted-foreground">{p.ram_gb} GB</td>
                            <td className="px-4 py-2 text-sm text-muted-foreground">{p.storage_gb} GB</td>
                            <td className="px-4 py-2 text-sm text-muted-foreground">{p.network_mbps} Mbps</td>
                            <td className="px-4 py-2 text-sm text-muted-foreground">${computeContainerPlanPrice(p).toFixed(2)}</td>
                            <td className="px-4 py-2 text-sm">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${p.active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 bg-muted text-muted-foreground'}`}>{p.active ? 'Active' : 'Inactive'}</span>
                            </td>
                            <td className="px-4 py-2 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => { setEditContainerPlanId(p.id); setEditContainerPlan(p); }}
                                  className="inline-flex items-center px-2 py-1 rounded-md text-xs border border bg-card text-foreground hover:bg-secondary/80"
                                >
                                  <Edit className="h-3 w-3 mr-1" /> Edit
                                </button>
                                <button
                                  onClick={() => setDeleteContainerPlanId(p.id)}
                                  className="inline-flex items-center px-2 py-1 rounded-md text-xs border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 bg-card hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'networking' && (
          <div className="bg-card shadow sm:rounded-lg">
            <div className="px-6 py-4 border-b border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-gray-400 " />
                <h2 className="text-lg font-medium text-foreground">Networking</h2>
              </div>
            </div>
            <div className="px-6 py-4">
              {/* Subtabs */}
              <div className="mb-4 border-b border">
                <nav className="-mb-px flex space-x-4" aria-label="Networking Tabs">
                  <button
                    onClick={() => setNetworkingTab('rdns')}
                    className={`whitespace-nowrap py-2 px-1 border-b-2 text-sm font-medium ${
                      networkingTab === 'rdns' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-muted-foreground hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    rDNS
                  </button>
                </nav>
              </div>

              {networkingTab === 'rdns' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-md font-medium text-foreground mb-2">Reverse DNS Template</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Define the base domain used when setting custom rDNS for VPS instances.
                      If unset, the system uses <span className="font-mono">ip.rev.skyvps360.xyz</span>.
                      During provisioning we automatically prepend <span className="font-mono">0-0-0-0.</span> and later
                      set the final rDNS to the hyphenated IPv4, e.g. <span className="font-mono">a-b-c-d.base</span>.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">rDNS base domain</label>
                        <input
                          type="text"
                          value={rdnsBaseDomain}
                          onChange={(e) => setRdnsBaseDomain(e.target.value)}
                          placeholder="ip.rev.skyvps360.xyz"
                          className="w-full rounded-md border bg-secondary text-foreground shadow-sm focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                          disabled={rdnsLoading}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Example final rDNS: <span className="font-mono">123-45-67-89.{rdnsBaseDomain || 'ip.rev.skyvps360.xyz'}</span>
                        </p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={saveNetworkingRdns}
                        disabled={rdnsSaving || rdnsLoading}
                        className="inline-flex items-center px-3 py-1 rounded-md text-sm border border bg-secondary text-foreground hover:bg-secondary/80 disabled:opacity-50"
                      >
                        {rdnsSaving ? 'Saving...' : 'Save rDNS Template'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'providers' && (
          <div className="bg-card shadow sm:rounded-lg">
            <div className="px-6 py-4 border-b border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-gray-400" />
                <h2 className="text-lg font-medium text-foreground">Service Providers</h2>
              </div>
              <button
                onClick={() => setShowAddProvider(true)}
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Provider
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Active</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {providers.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">No providers configured</td>
                      </tr>
                    ) : (
                      providers.map(provider => (
                        <tr key={provider.id}>
                          <td className="px-4 py-2 text-sm text-foreground">{provider.name}</td>
                          <td className="px-4 py-2 text-sm text-muted-foreground">{provider.type}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${provider.active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 bg-muted text-muted-foreground'}`}>
                              {provider.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => { setEditProviderId(provider.id); setEditProvider(provider); }}
                                className="inline-flex items-center px-2 py-1 rounded-md text-xs border border bg-card text-foreground hover:bg-secondary/80"
                              >
                                <Edit className="h-3 w-3 mr-1" /> Edit
                              </button>
                              <button
                                onClick={() => setDeleteProviderId(provider.id)}
                                className="inline-flex items-center px-2 py-1 rounded-md text-xs border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 bg-card hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="h-3 w-3 mr-1" /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add Provider Modal */}
              {showAddProvider && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                  <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                    <div className="mt-3">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Add Service Provider</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name
                          </label>
                          <input
                            type="text"
                            value={newProvider.name}
                            onChange={(e) => setNewProvider(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="e.g. Linode"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Type
                          </label>
                          <select
                            value={newProvider.type}
                            onChange={(e) => setNewProvider(prev => ({ ...prev, type: e.target.value }))}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value="">Select type</option>
                            <option value="linode">Linode</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            API Key
                          </label>
                          <input
                            type="password"
                            value={newProvider.apiKey}
                            onChange={(e) => setNewProvider(prev => ({ ...prev, apiKey: e.target.value }))}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="Enter API key"
                          />
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="providerActive"
                            checked={newProvider.active}
                            onChange={(e) => setNewProvider(prev => ({ ...prev, active: e.target.checked }))}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="providerActive" className="ml-2 block text-sm text-gray-900">
                            Active
                          </label>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-end gap-3 mt-6">
                        <button
                          onClick={() => {
                            setShowAddProvider(false);
                            setNewProvider({
                              name: '',
                              type: '',
                              apiKey: '',
                              active: true
                            });
                          }}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={createProvider}
                          disabled={!newProvider.name || !newProvider.type || !newProvider.apiKey}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add Provider
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit Container Plan Modal */}
        {editContainerPlanId && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 bg-background dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border w-[500px] shadow-lg rounded-md bg-card">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-foreground mb-4">Edit Container Plan</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Name</label>
                    <input
                      type="text"
                      value={editContainerPlan.name || ''}
                      onChange={(e) => setEditContainerPlan(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full rounded-md border shadow-sm bg-secondary text-foreground focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">CPU Cores</label>
                      <input
                        type="number"
                        min="1"
                        value={editContainerPlan.cpu_cores || ''}
                        onChange={(e) => setEditContainerPlan(prev => ({ ...prev, cpu_cores: parseInt(e.target.value) }))}
                        className="w-full rounded-md border shadow-sm bg-secondary text-foreground focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">RAM (GB)</label>
                      <input
                        type="number"
                        min="1"
                        value={editContainerPlan.ram_gb || ''}
                        onChange={(e) => setEditContainerPlan(prev => ({ ...prev, ram_gb: parseInt(e.target.value) }))}
                        className="w-full rounded-md border shadow-sm bg-secondary text-foreground focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Storage (GB)</label>
                      <input
                        type="number"
                        min="1"
                        value={editContainerPlan.storage_gb || ''}
                        onChange={(e) => setEditContainerPlan(prev => ({ ...prev, storage_gb: parseInt(e.target.value) }))}
                        className="w-full rounded-md border shadow-sm bg-secondary text-foreground focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Network (Mbps)</label>
                      <input
                        type="number"
                        min="0"
                        value={editContainerPlan.network_mbps || ''}
                        onChange={(e) => setEditContainerPlan(prev => ({ ...prev, network_mbps: parseInt(e.target.value) }))}
                        className="w-full rounded-md border shadow-sm bg-secondary text-foreground focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editContainerPlan.base_price || ''}
                      onChange={(e) => setEditContainerPlan(prev => ({ ...prev, base_price: parseFloat(e.target.value) }))}
                      className="w-full rounded-md border shadow-sm bg-secondary text-foreground placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                      placeholder="Monthly price"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Active</label>
                    <select
                      value={editContainerPlan.active ? 'true' : 'false'}
                      onChange={(e) => setEditContainerPlan(prev => ({ ...prev, active: e.target.value === 'true' }))}
                      className="w-full rounded-md border shadow-sm bg-secondary text-foreground focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    onClick={() => { setEditContainerPlanId(null); setEditContainerPlan({}); }}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground bg-secondary border border rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateContainerPlan}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 border border-transparent rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Provider Modal */}
        {editProviderId && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border w-96 shadow-lg rounded-md bg-card">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-foreground mb-4">Edit Provider</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Name</label>
                    <input
                      type="text"
                      value={editProvider.name || ''}
                      onChange={(e) => setEditProvider(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full rounded-md border bg-secondary text-foreground shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Active</label>
                    <select
                      value={editProvider.active ? 'true' : 'false'}
                      onChange={(e) => setEditProvider(prev => ({ ...prev, active: e.target.value === 'true' }))}
                      className="w-full rounded-md border bg-secondary text-foreground shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    onClick={() => { setEditProviderId(null); setEditProvider({}); }}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground bg-secondary border border rounded-md hover:bg-secondary/80"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateProvider}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 border border-transparent rounded-md hover:bg-blue-700 dark:hover:bg-blue-800"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Ticket Confirmation Modal */}
        {deleteTicketId && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border w-96 shadow-lg rounded-md bg-card">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-foreground mb-4">Delete Ticket</h3>
                <p className="text-sm text-muted-foreground mb-6">Are you sure you want to delete this ticket? This action cannot be undone.</p>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setDeleteTicketId(null)}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground bg-secondary border border rounded-md hover:bg-secondary/80"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteTicket(deleteTicketId)}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-700 border border-transparent rounded-md hover:bg-red-700 dark:hover:bg-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete VPS Plan Confirmation Modal */}
        {deletePlanId && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border w-96 shadow-lg rounded-md bg-card">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-foreground mb-4">Delete VPS Plan</h3>
                <p className="text-sm text-muted-foreground mb-6">Are you sure you want to delete this VPS plan? This action cannot be undone.</p>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setDeletePlanId(null)}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground bg-secondary border border rounded-md hover:bg-secondary/80"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteVPSPlan(deletePlanId)}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-700 border border-transparent rounded-md hover:bg-red-700 dark:hover:bg-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Container Plan Confirmation Modal */}
        {deleteContainerPlanId && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border w-96 shadow-lg rounded-md bg-card">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-foreground mb-4">Delete Container Plan</h3>
                <p className="text-sm text-muted-foreground mb-6">Are you sure you want to delete this container plan? This action cannot be undone.</p>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setDeleteContainerPlanId(null)}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground bg-secondary border border rounded-md hover:bg-secondary/80"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteContainerPlan(deleteContainerPlanId)}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-700 border border-transparent rounded-md hover:bg-red-700 dark:hover:bg-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Provider Confirmation Modal */}
        {deleteProviderId && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border w-96 shadow-lg rounded-md bg-card">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-foreground mb-4">Delete Provider</h3>
                <p className="text-sm text-muted-foreground mb-6">Are you sure you want to delete this provider? This action cannot be undone.</p>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setDeleteProviderId(null)}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground bg-secondary border border rounded-md hover:bg-secondary/80"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteProvider(deleteProviderId)}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-700 border border-transparent rounded-md hover:bg-red-700 dark:hover:bg-red-800"
                  >
                    Delete
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

export default Admin;