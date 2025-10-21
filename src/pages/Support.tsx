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
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';


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
  }, [selectedTicket, token, scrollToBottom]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (!selectedTicket || selectedTicket.messages.length === 0) {
      return;
    }
    scrollToBottom();
  }, [selectedTicket, scrollToBottom]);

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
      case 'closed': return 'bg-gray-100 text-foreground bg-muted text-muted-foreground';
      default: return 'bg-gray-100 text-foreground bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-foreground bg-muted text-muted-foreground';
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
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                variant="default"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                New Ticket
              </Button>

              <div className="flex-1 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 sm:h-4 sm:w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Search tickets by subject, description, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-14 sm:h-12 min-h-[56px] pl-10 sm:pl-9 pr-4 text-base sm:text-sm font-medium placeholder:font-normal touch-manipulation"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                    <SelectTrigger className="min-w-[150px] h-14 sm:h-10 min-h-[56px] sm:min-h-[40px] touch-manipulation text-base sm:text-sm">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value)}>
                    <SelectTrigger className="min-w-[150px] h-14 sm:h-10 min-h-[56px] sm:min-h-[40px] touch-manipulation text-base sm:text-sm">
                      <SelectValue placeholder="All Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Tickets List */}
            <div className="bg-card shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-border">
                {filteredTickets.length === 0 ? (
                  <li className="px-6 py-12 text-center">
                    <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground " />
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
                            <div className="mt-2 flex items-center text-xs text-muted-foreground  gap-4">
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
                    className="text-sm text-primary hover:text-primary/80 mb-2"
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
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-card text-foreground'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <User className={`h-4 w-4 ${message.sender_type === 'admin' ? 'text-primary-foreground/80' : 'text-muted-foreground'}`} />
                          <span className={`text-xs font-medium ${message.sender_type === 'admin' ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                            {message.sender_name}
                          </span>
                          <span className={`text-xs ${message.sender_type === 'admin' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            {formatDate(message.created_at)}
                          </span>
                        </div>
                        <p className={`text-sm whitespace-pre-wrap ${message.sender_type === 'admin' ? 'text-primary-foreground' : 'text-foreground'}`}>
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
                  <CheckCircle className="h-12 w-12 text-muted-foreground  mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">This ticket has been closed</p>
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Textarea
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
                      className="w-full"
                    />
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={loading || !newMessage.trim()}
                    variant="default"
                    size="icon"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
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
                  className="text-muted-foreground  hover:text-foreground dark:hover:text-muted-foreground"
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
                  <Input
                    type="text"
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Brief description of your issue"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Category
                  </label>
                  <Select
                    value={newTicket.category}
                    onValueChange={(value) => setNewTicket(prev => ({ ...prev, category: value as any }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="billing">Billing</SelectItem>
                      <SelectItem value="feature_request">Feature Request</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Priority
                  </label>
                  <Select
                    value={newTicket.priority}
                    onValueChange={(value) => setNewTicket(prev => ({ ...prev, priority: value as any }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Description *
                  </label>
                  <Textarea
                    value={newTicket.description}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    placeholder="Detailed description of your issue or question"
                    className="w-full"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  onClick={handleCreateTicket}
                  disabled={loading || !newTicket.subject.trim() || !newTicket.description.trim()}
                  className="flex-1"
                  variant="default"
                >
                  {loading ? 'Creating...' : 'Create Ticket'}
                </Button>
                <Button
                  onClick={() => setIsCreateModalOpen(false)}
                  variant="secondary"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Support;
