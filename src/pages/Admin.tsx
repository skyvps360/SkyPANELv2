/**
 * Admin Dashboard
 * Manage support tickets and VPS plans
 */
import React, { useEffect, useMemo, useState } from 'react';
// Navigation provided by AppLayout
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { Settings, ClipboardList, Ticket, DollarSign, Edit, CheckCircle, AlertCircle, Server, Plus } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'tickets' | 'plans' | 'containers'>('tickets');
  const [loading, setLoading] = useState(false);

  // Tickets state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');

  // Plans state
  const [plans, setPlans] = useState<VPSPlan[]>([]);
  const [editPlanId, setEditPlanId] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState<Partial<VPSPlan>>({});
  const [pricing, setPricing] = useState<PricingConfig>({ price_per_cpu: 0, price_per_ram_gb: 0, price_per_storage_gb: 0, price_per_network_mbps: 0, currency: 'USD' });
  const [containerPlans, setContainerPlans] = useState<ContainerPlan[]>([]);
  const [newContainerPlan, setNewContainerPlan] = useState<Partial<ContainerPlan>>({ name: '', cpu_cores: 1, ram_gb: 1, storage_gb: 10, network_mbps: 0, base_price: 0, markup_price: 0, active: true });
  
  // Linode VPS state
  const [linodeTypes, setLinodeTypes] = useState<LinodeType[]>([]);
  const [linodeRegions, setLinodeRegions] = useState<LinodeRegion[]>([]);
  const [showAddVPSPlan, setShowAddVPSPlan] = useState(false);
  const [newVPSPlan, setNewVPSPlan] = useState({
    selectedType: '',
    selectedRegion: '',
    markupPrice: 0,
    active: true
  });

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  useEffect(() => {
    // initial load per tab
    if (activeTab === 'tickets') {
      fetchTickets();
    } else if (activeTab === 'plans') {
      fetchPlans();
      fetchLinodeTypes();
      fetchLinodeRegions();
    } else {
      fetchPricing();
      fetchContainerPlans();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchTickets = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/tickets`, { headers: authHeader });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load tickets');
      setTickets(data.tickets);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
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
      setReplyMessage('');
      toast.success('Reply sent');
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

    try {
      const res = await fetch(`${API_BASE_URL}/admin/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({
          provider_id: 'linode',
          name: `${selectedType.label} - ${newVPSPlan.selectedRegion}`,
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

  const filteredTickets = tickets.filter(t => (statusFilter === 'all' ? true : t.status === statusFilter));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500">Manage support tickets and VPS plans</p>
          </div>
          <Settings className="h-6 w-6 text-gray-400" />
        </div>

        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('tickets')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 text-sm font-medium ${
                activeTab === 'tickets' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Ticket className="h-4 w-4 inline mr-2" /> Tickets
            </button>
            <button
              onClick={() => setActiveTab('plans')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 text-sm font-medium ${
                activeTab === 'plans' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <DollarSign className="h-4 w-4 inline mr-2" /> VPS Plans
            </button>
            <button
              onClick={() => setActiveTab('containers')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 text-sm font-medium ${
                activeTab === 'containers' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Server className="h-4 w-4 inline mr-2" /> Container Plans
            </button>
          </nav>
        </div>

        {activeTab === 'tickets' ? (
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ClipboardList className="h-5 w-5 text-gray-400" />
                <h2 className="text-lg font-medium">Support Tickets</h2>
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                  <ul className="divide-y divide-gray-200">
                    {filteredTickets.length === 0 ? (
                      <li className="px-4 py-10 text-center text-gray-500">No tickets found</li>
                    ) : (
                      filteredTickets.map(t => (
                        <li key={t.id}>
                          <button
                            className="w-full text-left px-4 py-3 hover:bg-gray-50"
                            onClick={() => setSelectedTicket(t)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-900">{t.subject}</div>
                                <div className="text-sm text-gray-500">{t.category} • {new Date(t.created_at).toLocaleString()}</div>
                              </div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                t.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                                t.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                t.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
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
                    <div className="px-4 py-10 text-center text-gray-500">
                      Select a ticket to view details
                    </div>
                  ) : (
                    <div className="border rounded-md">
                      <div className="px-4 py-3 border-b">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-lg font-semibold text-gray-900">{selectedTicket.subject}</div>
                            <div className="text-sm text-gray-500">{selectedTicket.category}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="inline-flex items-center px-3 py-1 rounded-md text-sm border bg-white hover:bg-gray-50"
                              onClick={() => updateTicketStatus(selectedTicket.id, 'in_progress')}
                            >
                              <AlertCircle className="h-4 w-4 mr-1" /> In Progress
                            </button>
                            <button
                              className="inline-flex items-center px-3 py-1 rounded-md text-sm border bg-white hover:bg-gray-50"
                              onClick={() => updateTicketStatus(selectedTicket.id, 'resolved')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" /> Resolve
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="px-4 py-3 space-y-3">
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTicket.message}</div>
                        <div className="pt-3 border-t">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Reply</label>
                          <textarea
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            rows={3}
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            placeholder="Type your response to the client"
                          />
                          <div className="mt-2">
                            <button
                              onClick={sendReply}
                              disabled={!replyMessage.trim()}
                              className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                            >
                              Send Reply
                            </button>
                            <button
                              onClick={() => setSelectedTicket(null)}
                              className="ml-2 inline-flex items-center px-4 py-2 rounded-md text-sm border bg-white hover:bg-gray-50"
                            >
                              Close
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
        ) : activeTab === 'plans' ? (
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-gray-400" />
                <h2 className="text-lg font-medium">VPS Plans</h2>
              </div>
              <button
                onClick={() => setShowAddVPSPlan(true)}
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New VPS Plan
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider Plan ID</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Markup Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {plans.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-gray-500">No plans available</td>
                      </tr>
                    ) : (
                      plans.map(plan => (
                        <tr key={plan.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">{plan.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{plan.provider_plan_id}</td>
                          <td className="px-4 py-2">
                            {editPlanId === plan.id ? (
                              <input
                                type="number"
                                step="0.01"
                                className="w-28 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                value={editPlan.base_price as number | undefined ?? plan.base_price}
                                onChange={(e) => setEditPlan(prev => ({ ...prev, base_price: parseFloat(e.target.value) }))}
                              />
                            ) : (
                              <span className="text-sm text-gray-700">${plan.base_price.toFixed(2)}</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {editPlanId === plan.id ? (
                              <input
                                type="number"
                                step="0.01"
                                className="w-28 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                value={editPlan.markup_price as number | undefined ?? plan.markup_price}
                                onChange={(e) => setEditPlan(prev => ({ ...prev, markup_price: parseFloat(e.target.value) }))}
                              />
                            ) : (
                              <span className="text-sm text-gray-700">${plan.markup_price.toFixed(2)}</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {editPlanId === plan.id ? (
                              <select
                                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                value={(editPlan.active as boolean | undefined ?? plan.active) ? 'true' : 'false'}
                                onChange={(e) => setEditPlan(prev => ({ ...prev, active: e.target.value === 'true' }))}
                              >
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                              </select>
                            ) : (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${plan.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {plan.active ? 'Active' : 'Inactive'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {editPlanId === plan.id ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={savePlan}
                                  className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => { setEditPlanId(null); setEditPlan({}); }}
                                  className="inline-flex items-center px-3 py-1 rounded-md text-sm border bg-white hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setEditPlanId(plan.id); setEditPlan({ base_price: plan.base_price, markup_price: plan.markup_price, active: plan.active }); }}
                                className="inline-flex items-center px-3 py-1 rounded-md text-sm border bg-white hover:bg-gray-50"
                              >
                                <Edit className="h-4 w-4 mr-1" /> Edit
                              </button>
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
                  <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                    <div className="mt-3">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Add New VPS Plan</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Linode Plan Type
                          </label>
                          <select
                            value={newVPSPlan.selectedType}
                            onChange={(e) => setNewVPSPlan(prev => ({ ...prev, selectedType: e.target.value }))}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value="">Select a plan type</option>
                            {linodeTypes.map(type => (
                              <option key={type.id} value={type.id}>
                                {type.label} - {type.vcpus} vCPUs, {type.memory}MB RAM, {type.disk}GB Storage - ${type.price.monthly}/mo
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Region
                          </label>
                          <select
                            value={newVPSPlan.selectedRegion}
                            onChange={(e) => setNewVPSPlan(prev => ({ ...prev, selectedRegion: e.target.value }))}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          >
                            <option value="">Select a region</option>
                            {linodeRegions.map(region => (
                              <option key={region.id} value={region.id}>
                                {region.label} ({region.country})
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Markup Price (USD)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={newVPSPlan.markupPrice}
                            onChange={(e) => setNewVPSPlan(prev => ({ ...prev, markupPrice: parseFloat(e.target.value) || 0 }))}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="0.00"
                          />
                        </div>
                        
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="active"
                            checked={newVPSPlan.active}
                            onChange={(e) => setNewVPSPlan(prev => ({ ...prev, active: e.target.checked }))}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                            Active
                          </label>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-end gap-3 mt-6">
                        <button
                          onClick={() => {
                            setShowAddVPSPlan(false);
                            setNewVPSPlan({
                              selectedType: '',
                              selectedRegion: '',
                              markupPrice: 0,
                              active: true
                            });
                          }}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={createVPSPlan}
                          disabled={!newVPSPlan.selectedType || !newVPSPlan.selectedRegion}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
        ) : (
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-gray-400" />
                <h2 className="text-lg font-medium">Container Pricing & Plans</h2>
              </div>
            </div>
            <div className="px-6 py-4 space-y-6">
              <div>
                <h3 className="text-md font-medium mb-3">Pricing Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Per CPU (USD)</label>
                    <input type="number" step="0.01" className="w-full rounded-md border-gray-300" value={pricing.price_per_cpu}
                      onChange={e => setPricing(p => ({ ...p, price_per_cpu: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Per RAM GB</label>
                    <input type="number" step="0.01" className="w-full rounded-md border-gray-300" value={pricing.price_per_ram_gb}
                      onChange={e => setPricing(p => ({ ...p, price_per_ram_gb: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Per Storage GB</label>
                    <input type="number" step="0.01" className="w-full rounded-md border-gray-300" value={pricing.price_per_storage_gb}
                      onChange={e => setPricing(p => ({ ...p, price_per_storage_gb: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Per Mbps</label>
                    <input type="number" step="0.01" className="w-full rounded-md border-gray-300" value={pricing.price_per_network_mbps}
                      onChange={e => setPricing(p => ({ ...p, price_per_network_mbps: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <input className="w-full rounded-md border-gray-300" value={pricing.currency}
                      onChange={e => setPricing(p => ({ ...p, currency: e.target.value }))} />
                  </div>
                </div>
                <div className="mt-3">
                  <button className="inline-flex items-center px-3 py-1 rounded-md text-sm border bg-white hover:bg-gray-50" onClick={savePricing}>Save Pricing</button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-md font-medium">Container Plans</h3>
                </div>
                <div className="border rounded-md p-4 bg-gray-50 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <input className="rounded-md border-gray-300" placeholder="Name" value={newContainerPlan.name as string}
                      onChange={e => setNewContainerPlan(p => ({ ...p, name: e.target.value }))} />
                    <input type="number" min={1} className="rounded-md border-gray-300" placeholder="CPU" value={newContainerPlan.cpu_cores as number}
                      onChange={e => setNewContainerPlan(p => ({ ...p, cpu_cores: Number(e.target.value) }))} />
                    <input type="number" min={1} className="rounded-md border-gray-300" placeholder="RAM (GB)" value={newContainerPlan.ram_gb as number}
                      onChange={e => setNewContainerPlan(p => ({ ...p, ram_gb: Number(e.target.value) }))} />
                    <input type="number" min={1} className="rounded-md border-gray-300" placeholder="Storage (GB)" value={newContainerPlan.storage_gb as number}
                      onChange={e => setNewContainerPlan(p => ({ ...p, storage_gb: Number(e.target.value) }))} />
                    <input type="number" min={0} className="rounded-md border-gray-300" placeholder="Network (Mbps)" value={newContainerPlan.network_mbps as number}
                      onChange={e => setNewContainerPlan(p => ({ ...p, network_mbps: Number(e.target.value) }))} />
                    <button className="inline-flex items-center px-3 py-2 rounded-md text-sm border bg-white hover:bg-gray-50" onClick={createContainerPlan}>
                      <Plus className="h-4 w-4 mr-1" /> Add Plan
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPU</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RAM</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Storage</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Network</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Markup</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {containerPlans.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-10 text-center text-gray-500">No container plans</td>
                        </tr>
                      ) : (
                        containerPlans.map(p => (
                          <tr key={p.id}>
                            <td className="px-4 py-2 text-sm text-gray-900">{p.name}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">{p.cpu_cores}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">{p.ram_gb} GB</td>
                            <td className="px-4 py-2 text-sm text-gray-500">{p.storage_gb} GB</td>
                            <td className="px-4 py-2 text-sm text-gray-500">{p.network_mbps} Mbps</td>
                            <td className="px-4 py-2 text-sm text-gray-500">${p.base_price.toFixed(2)}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">${p.markup_price.toFixed(2)}</td>
                            <td className="px-4 py-2 text-sm">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${p.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{p.active ? 'Active' : 'Inactive'}</span>
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
      </div>
    </div>
  );
};

export default Admin;