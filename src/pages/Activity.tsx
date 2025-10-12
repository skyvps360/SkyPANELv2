import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Activity as ActivityIcon, Filter, Download } from 'lucide-react';

interface ActivityRecord {
  id: string;
  user_id: string;
  organization_id?: string | null;
  event_type: string;
  entity_type: string;
  entity_id?: string | null;
  message?: string | null;
  status: 'success' | 'warning' | 'error' | 'info';
  metadata?: any;
  created_at: string;
}

const ActivityPage: React.FC = () => {
  const { token } = useAuth();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [limit, setLimit] = useState<number>(50);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type) params.set('type', type);
      if (status) params.set('status', status);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      params.set('limit', String(limit));
      const res = await fetch(`/api/activity?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load activity');
      setActivities(data.activities || []);
    } catch (err) {
      console.error('Activity load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportCsv = () => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const url = `/api/activity/export?${params.toString()}`;
    // Open in new tab/window to trigger download; include auth header via fetch for blob
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        const blob = await res.blob();
        const dlUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = dlUrl;
        a.download = 'activity_export.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(dlUrl);
      })
      .catch(err => console.error('Export error:', err));
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'success': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ActivityIcon className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Activity</h1>
          </div>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="flex items-end gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Type</label>
              <input value={type} onChange={e => setType(e.target.value)} className="px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white" placeholder="vps, container, billing" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
                <option value="">Any</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="info">Info</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">From</label>
              <input type="datetime-local" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">To</label>
              <input type="datetime-local" value={to} onChange={e => setTo(e.target.value)} className="px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Limit</label>
              <input type="number" min={1} max={200} value={limit} onChange={e => setLimit(Number(e.target.value))} className="px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white w-24" />
            </div>
            <button onClick={fetchActivities} className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white">
              <Filter className="h-4 w-4" /> Apply
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-6">Loading...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Event</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Message</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {activities.map(a => (
                  <tr key={a.id}>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{new Date(a.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{a.entity_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{a.event_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{a.message || ''}</td>
                    <td className={`px-6 py-4 text-sm font-medium ${getStatusColor(a.status)}`}>{a.status}</td>
                  </tr>
                ))}
                {activities.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">No activity found</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityPage;