/**
 * Support Tickets Page - Live Chat Interface
 * Real-time messaging with support team
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  MessageSquare, 
  Calendar, 
  User, 
  HelpCircle,
  Send,
  X,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
// Navigation provided by AppLayout
import { useAuth } from '../contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

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
  has_staff_reply: boolean;
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
  const [createErrors, setCreateErrors] = useState<string[]>([]);
  const { token } = useAuth();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

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
          has_staff_reply: t.has_staff_reply || false,
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

  // Set up real-time updates for selected ticket
  useEffect(() => {
    if (!selectedTicket || !token) return;

    const es = new EventSource(`/api/support/tickets/${selectedTicket.id}/stream?token=${token}`);
    eventSourceRef.current = es;

    es.onopen = () => {
      console.log('✅ Connected to ticket stream');
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected') {
          return;
        }

        if (data.type === 'ticket_message' && data.ticket_id === selectedTicket.id) {
          const newMsg: TicketMessage = {
            id: data.message_id,
            ticket_id: data.ticket_id,
            sender_type: data.is_staff_reply ? 'admin' : 'user',
            sender_name: data.is_staff_reply ? 'Staff Member' : 'You',
            message: data.message,
            created_at: data.created_at,
          };

          setSelectedTicket(prev => {
            if (!prev || prev.id !== data.ticket_id) return prev;
            if (prev.messages.some(m => m.id === newMsg.id)) return prev;
            
            const updated = {
              ...prev,
              messages: [...prev.messages, newMsg],
              has_staff_reply: prev.has_staff_reply || data.is_staff_reply
            };
            
            if (data.is_staff_reply) {
              toast.success('New reply from staff');
            }
            
            return updated;
          });

          setTickets(prev => prev.map(t => 
            t.id === data.ticket_id 
              ? { ...t, has_staff_reply: t.has_staff_reply || data.is_staff_reply }
              : t
          ));

          setTimeout(scrollToBottom, 100);
        }

        if (data.type === 'ticket_status_change' && data.ticket_id === selectedTicket.id) {
          setSelectedTicket(prev => prev ? { ...prev, status: data.new_status } : prev);
          setTickets(prev => prev.map(t => t.id === data.ticket_id ? { ...t, status: data.new_status } : t));
          toast.info(`Ticket status updated to: ${data.new_status.replace('_', ' ')}`);
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err);
      }
    };

    es.onerror = (err) => {
      console.error('SSE error:', err);
      es.close();
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [selectedTicket?.id, token, scrollToBottom]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (selectedTicket && selectedTicket.messages.length > 0) {
      scrollToBottom();
    }
  }, [selectedTicket?.messages.length, scrollToBottom]);

  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    priority: 'medium' as const,
    category: 'general' as const
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'closed': return 'bg-gray-100 text-gray-800 bg-muted text-muted-foreground';
      default: return 'bg-gray-100 text-gray-800 bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 bg-muted text-muted-foreground';
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
      setCreateErrors(['Subject and Description are required']);
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
      if (!res.ok) {
        const messages: string[] = Array.isArray(data.errors)
          ? data.errors.map((e: any) => (e.msg && e.param ? `${e.param}: ${e.msg}` : e.msg || 'Validation error'))
          : (data.error ? [data.error] : ['Failed to create ticket']);
        setCreateErrors(messages);
        toast.error(messages.join('\n'));
        return;
      }

      const ticket: SupportTicket = {
        id: data.ticket.id,
        subject: data.ticket.subject,
        description: data.ticket.message,
        status: data.ticket.status,
        priority: data.ticket.priority,
        category: data.ticket.category,
        created_at: data.ticket.created_at,
        updated_at: data.ticket.updated_at,
        has_staff_reply: false,
        messages: [],
      };

      setTickets(prev => [ticket, ...prev]);
      setNewTicket({ subject: '', description: '', priority: 'medium', category: 'general' });
      setCreateErrors([]);
      setIsCreateModalOpen(false);
      toast.success('Support ticket created successfully');
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      const message = error?.message || 'Failed to create support ticket';
      setCreateErrors([message]);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: newMessage.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reply');
      const reply: TicketMessage = {
        id: data.reply.id,
        ticket_id: data.reply.ticket_id,
        sender_type: data.reply.sender_type,
        sender_name: data.reply.sender_name,
        message: data.reply.message,
        created_at: data.reply.created_at,
      };
      setSelectedTicket(prev => prev ? { ...prev, messages: [...prev.messages, reply] } : prev);
      setNewMessage('');
      toast.success('Reply sent');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const openTicket = async (ticket: SupportTicket) => {
    setSelectedTicket({ ...ticket, messages: [] });
    try {
      const res = await fetch(`/api/support/tickets/${ticket.id}/replies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load messages');
      const msgs: TicketMessage[] = (data.replies || []).map((m: any) => ({
        id: m.id,
        ticket_id: m.ticket_id,
        sender_type: m.sender_type,
        sender_name: m.sender_name,
        message: m.message,
        created_at: m.created_at,
      }));
      setSelectedTicket(prev => prev ? { ...prev, messages: msgs } : prev);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load messages');
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
    <div className="space-y-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedTicket ? (
          <>
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">Support Tickets</h1>
              <p className="mt-2 text-muted-foreground">
                Get help with your containers, VPS instances, and billing questions
              </p>
            </div>

            {/* Actions and Filters */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </button>

              <div className="flex-1 flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 " />
                  <input
                    type="text"
                    placeholder="Search tickets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full px-3 py-2 border border rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-secondary text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-md border shadow-sm bg-secondary text-foreground focus:border-blue-500 focus:ring-blue-500"
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
                  className="rounded-md border shadow-sm bg-secondary text-foreground focus:border-blue-500 focus:ring-blue-500"
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
            <div className="bg-card shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-border">
                {filteredTickets.length === 0 ? (
                  <li className="px-6 py-12 text-center">
                    <HelpCircle className="mx-auto h-12 w-12 text-gray-400 " />
                    <h3 className="mt-2 text-sm font-medium text-foreground">No tickets found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                        ? 'Try adjusting your search or filters'
                        : 'Get started by creating your first support ticket'}
                    </p>
                  </li>
                ) : (
                  filteredTickets.map((ticket) => (
                    <li key={ticket.id}>
                      <button
                        onClick={() => openTicket(ticket)}
                        className="w-full px-6 py-4 hover:bg-secondary/80 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700 text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-sm font-medium text-foreground truncate">
                                {ticket.subject}
                              </h3>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                {ticket.status.replace('_', ' ')}
                              </span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                                {ticket.priority}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {ticket.description}
                            </p>
                            <div className="mt-2 flex items-center text-xs text-gray-400  gap-4">
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
          <div className="bg-card shadow sm:rounded-lg">
            {/* Header */}
            <div className="px-6 py-4 border-b border">
              <div className="flex items-center justify-between">
                <div>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 mb-2"
                  >
                    ← Back to tickets
                  </button>
                  <h1 className="text-xl font-semibold text-foreground">{selectedTicket.subject}</h1>
                  <div className="mt-2 flex items-center gap-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedTicket.status)}`}>
                      {selectedTicket.status.replace('_', ' ')}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(selectedTicket.priority)}`}>
                      {selectedTicket.priority}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Created {formatDate(selectedTicket.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages - Chat Style */}
            <div className="px-6 py-4 h-[32rem] overflow-y-auto bg-background">
              <div className="space-y-4">
                {/* Initial ticket message */}
                <div className="flex justify-start">
                  <div className="max-w-xs lg:max-w-md">
                    <div className="bg-card rounded-lg px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">You</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(selectedTicket.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">{selectedTicket.description}</p>
                    </div>
                  </div>
                </div>

                {/* Conversation messages */}
                {selectedTicket.messages.map((message) => (
                  <div key={message.id} className={`flex ${message.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-xs lg:max-w-md">
                      <div className={`rounded-lg px-4 py-3 shadow-sm ${
                        message.sender_type === 'admin' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-card'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <User className={`h-4 w-4 ${message.sender_type === 'admin' ? 'text-blue-100' : 'text-muted-foreground'}`} />
                          <span className={`text-xs font-medium ${message.sender_type === 'admin' ? 'text-blue-100' : 'text-muted-foreground'}`}>
                            {message.sender_name}
                          </span>
                          <span className={`text-xs ${message.sender_type === 'admin' ? 'text-blue-100' : 'text-muted-foreground'}`}>
                            {formatDate(message.created_at)}
                          </span>
                        </div>
                        <p className={`text-sm whitespace-pre-wrap ${message.sender_type === 'admin' ? 'text-white' : 'text-foreground'}`}>
                          {message.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Auto-scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Message Input */}
            <div className="px-6 py-4 border-t border bg-card">
              {selectedTicket.status === 'closed' ? (
                <div className="text-center py-4">
                  <CheckCircle className="h-12 w-12 text-gray-400  mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">This ticket has been closed</p>
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                      rows={3}
                      className="w-full rounded-md border shadow-sm bg-secondary text-foreground placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={loading || !newMessage.trim()}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Ticket Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 bg-background dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border border w-96 shadow-lg rounded-md bg-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-foreground">Create Support Ticket</h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-gray-400  hover:text-gray-600 dark:hover:text-gray-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {createErrors.length > 0 && (
                  <div className="rounded-md border border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
                    <div className="font-medium mb-1">Unable to create ticket:</div>
                    <ul className="list-disc pl-5 space-y-1">
                      {createErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full rounded-md border shadow-sm bg-secondary text-foreground placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Brief description of your issue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Category
                  </label>
                  <select
                    value={newTicket.category}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full rounded-md border shadow-sm bg-secondary text-foreground focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="general">General</option>
                    <option value="technical">Technical</option>
                    <option value="billing">Billing</option>
                    <option value="feature_request">Feature Request</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Priority
                  </label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full rounded-md border shadow-sm bg-secondary text-foreground focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Description *
                  </label>
                  <textarea
                    value={newTicket.description}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full rounded-md border shadow-sm bg-secondary text-foreground placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Detailed description of your issue or question"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleCreateTicket}
                  disabled={loading || !newTicket.subject.trim() || !newTicket.description.trim()}
                  className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Ticket'}
                </button>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border rounded-md shadow-sm text-sm font-medium text-muted-foreground bg-secondary hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
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