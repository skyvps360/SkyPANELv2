/**
 * Support Tickets Page
 * Manage support tickets and communication with support team
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  MessageSquare, 
  Calendar, 
  User, 
  HelpCircle,
  Send,
  X
} from 'lucide-react';
import { toast } from 'sonner';
// Navigation provided by AppLayout
import { useAuth } from '../contexts/AuthContext';

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_type: 'user' | 'admin';
  sender_name: string;
  message: string;
  created_at: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  category: 'technical' | 'billing' | 'general' | 'feature_request';
  created_at: string;
  updated_at: string;
  messages: TicketMessage[];
}

const Support: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/support/tickets', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load tickets');
        const mapped: SupportTicket[] = (data.tickets || []).map((t: any) => ({
          id: t.id,
          subject: t.subject,
          description: t.message,
          status: t.status,
          priority: t.priority,
          category: t.category,
          created_at: t.created_at,
          updated_at: t.updated_at,
          messages: [],
        }));
        setTickets(mapped);
      } catch (e: any) {
        toast.error(e.message || 'Failed to load tickets');
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [token]);

  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    priority: 'medium' as const,
    category: 'general' as const
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          subject: newTicket.subject.trim(),
          message: newTicket.description.trim(),
          priority: newTicket.priority,
          category: newTicket.category,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create ticket');

      const ticket: SupportTicket = {
        id: data.ticket.id,
        subject: data.ticket.subject,
        description: data.ticket.message,
        status: data.ticket.status,
        priority: data.ticket.priority,
        category: data.ticket.category,
        created_at: data.ticket.created_at,
        updated_at: data.ticket.updated_at,
        messages: [],
      };

      setTickets(prev => [ticket, ...prev]);
      setNewTicket({ subject: '', description: '', priority: 'medium', category: 'general' });
      setIsCreateModalOpen(false);
      toast.success('Support ticket created successfully');
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      toast.error(error.message || 'Failed to create support ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    setLoading(true);
    try {
      toast.info('Replying to tickets will be available soon');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedTicket ? (
          <>
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
              <p className="mt-2 text-gray-600">
                Get help with your containers, VPS instances, and billing questions
              </p>
            </div>

            {/* Actions and Filters */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </button>

              <div className="flex-1 flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tickets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="all">All Priority</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {/* Tickets List */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {filteredTickets.length === 0 ? (
                  <li className="px-6 py-12 text-center">
                    <HelpCircle className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No tickets found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                        ? 'Try adjusting your search or filters'
                        : 'Get started by creating your first support ticket'}
                    </p>
                  </li>
                ) : (
                  filteredTickets.map((ticket) => (
                    <li key={ticket.id}>
                      <button
                        onClick={() => setSelectedTicket(ticket)}
                        className="w-full px-6 py-4 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-sm font-medium text-gray-900 truncate">
                                {ticket.subject}
                              </h3>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                {ticket.status.replace('_', ' ')}
                              </span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                                {ticket.priority}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 truncate">
                              {ticket.description}
                            </p>
                            <div className="mt-2 flex items-center text-xs text-gray-400 gap-4">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(ticket.created_at)}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {ticket.messages.length} messages
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </>
        ) : (
          /* Ticket Detail View */
          <div className="bg-white shadow sm:rounded-lg">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="text-sm text-blue-600 hover:text-blue-500 mb-2"
                  >
                    ← Back to tickets
                  </button>
                  <h1 className="text-xl font-semibold text-gray-900">{selectedTicket.subject}</h1>
                  <div className="mt-2 flex items-center gap-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedTicket.status)}`}>
                      {selectedTicket.status.replace('_', ' ')}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(selectedTicket.priority)}`}>
                      {selectedTicket.priority}
                    </span>
                    <span className="text-sm text-gray-500">
                      Created {formatDate(selectedTicket.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="px-6 py-4 max-h-96 overflow-y-auto">
              <div className="space-y-4">
                {selectedTicket.messages.map((message) => (
                  <div key={message.id} className={`flex ${message.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender_type === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-3 w-3" />
                        <span className="text-xs font-medium">{message.sender_name}</span>
                        <span className="text-xs opacity-75">
                          {formatDate(message.created_at)}
                        </span>
                      </div>
                      <p className="text-sm">{message.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Message Input */}
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex gap-3">
                <div className="flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    rows={3}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={loading || !newMessage.trim()}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Ticket Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Create Support Ticket</h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Brief description of your issue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newTicket.category}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="general">General</option>
                    <option value="technical">Technical</option>
                    <option value="billing">Billing</option>
                    <option value="feature_request">Feature Request</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={newTicket.description}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Detailed description of your issue or question"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleCreateTicket}
                  disabled={loading || !newTicket.subject.trim() || !newTicket.description.trim()}
                  className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Ticket'}
                </button>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Support;