import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Activity as ActivityIcon, Filter, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

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

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  page: number;
  totalPages: number;
}

const ActivityPage: React.FC = () => {
  const { token } = useAuth();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [limit, setLimit] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    limit: 10,
    offset: 0,
    page: 1,
    totalPages: 1
  });
  const [pageInput, setPageInput] = useState<string>('');

  const fetchActivities = async (page: number = currentPage) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type) params.set('type', type);
      if (status) params.set('status', status);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      params.set('limit', String(limit));
      params.set('offset', String((page - 1) * limit));
      const res = await fetch(`/api/activity?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load activity');
      setActivities(data.activities || []);
      setPagination(data.pagination || {
        total: 0,
        limit: limit,
        offset: (page - 1) * limit,
        page: page,
        totalPages: 1
      });
      setCurrentPage(page);
    } catch (err) {
      console.error('Activity load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset to page 1 when filters or limit change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
      fetchActivities(1);
    } else {
      fetchActivities(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, status, from, to, limit]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchActivities(page);
    }
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    const current = pagination.page;
    const total = pagination.totalPages;

    if (total <= maxVisible) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, current - 2);
      let end = Math.min(total, start + maxVisible - 1);
      
      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    return pages;
  };

  const handleFirstPage = () => {
    handlePageChange(1);
  };

  const handleLastPage = () => {
    handlePageChange(pagination.totalPages);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(pageInput);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pagination.totalPages) {
      handlePageChange(pageNum);
      setPageInput('');
    }
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

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
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Items per page</label>
              <select value={limit} onChange={e => handleLimitChange(Number(e.target.value))} className="px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <button onClick={() => fetchActivities(1)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white">
              <Filter className="h-4 w-4" /> Apply
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-6">Loading...</div>
          ) : (
            <>
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

              {/* Pagination Controls */}
              {pagination.total > 0 && (
                <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page >= pagination.totalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-col sm:items-center sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="text-center lg:text-left">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          Showing{' '}
                          <span className="font-medium">{pagination.offset + 1}</span>
                          {' '}to{' '}
                          <span className="font-medium">
                            {Math.min(pagination.offset + pagination.limit, pagination.total)}
                          </span>
                          {' '}of{' '}
                          <span className="font-medium">{pagination.total}</span>
                          {' '}results
                        </p>
                      </div>
                      <div className="flex flex-col items-center gap-3 lg:flex-row lg:justify-center">
                        {/* Enhanced Pagination Navigation */}
                        <nav className="relative z-0 flex flex-wrap justify-center rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          {/* First Page Button */}
                          <button
                            onClick={handleFirstPage}
                            disabled={pagination.page <= 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="First page"
                          >
                            <span className="sr-only">First</span>
                            <ChevronsLeft className="h-5 w-5" aria-hidden="true" />
                          </button>
                          
                          {/* Previous Page Button */}
                          <button
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page <= 1}
                            className="relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Previous page"
                          >
                            <span className="sr-only">Previous</span>
                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                          </button>
                          
                          {/* Page Number Buttons */}
                          {getPageNumbers().map((pageNum) => (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                pageNum === pagination.page
                                  ? 'z-10 bg-blue-50 dark:bg-blue-900 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-300'
                                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                              }`}
                            >
                              {pageNum}
                            </button>
                          ))}
                          
                          {/* Next Page Button */}
                          <button
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page >= pagination.totalPages}
                            className="relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Next page"
                          >
                            <span className="sr-only">Next</span>
                            <ChevronRight className="h-5 w-5" aria-hidden="true" />
                          </button>
                          
                          {/* Last Page Button */}
                          <button
                            onClick={handleLastPage}
                            disabled={pagination.page >= pagination.totalPages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Last page"
                          >
                            <span className="sr-only">Last</span>
                            <ChevronsRight className="h-5 w-5" aria-hidden="true" />
                          </button>
                        </nav>

                        {/* Page Input Field */}
                        <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2 justify-center lg:justify-start">
                          <span className="text-sm text-gray-700 dark:text-gray-300">Go to:</span>
                          <input
                            type="number"
                            min="1"
                            max={pagination.totalPages}
                            value={pageInput}
                            onChange={handlePageInputChange}
                            placeholder="Page"
                            className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            type="submit"
                            className="px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!pageInput || parseInt(pageInput) < 1 || parseInt(pageInput) > pagination.totalPages}
                          >
                            Go
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityPage;