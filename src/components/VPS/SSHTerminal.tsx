import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import 'xterm/css/xterm.css';
import { API_BASE_URL, buildApiUrl } from '../../lib/api';

interface SSHTerminalProps {
  instanceId: string;
  isFullScreen?: boolean;
}

type WSStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export const SSHTerminal: React.FC<SSHTerminalProps> = ({ instanceId, isFullScreen = false }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<WSStatus>('disconnected');
  const [fontSize, setFontSize] = useState<number>(14);
  const [rows, setRows] = useState<number>(30);
  const [cols, setCols] = useState<number>(120);
  const [connectedUser, setConnectedUser] = useState<string>('root');
  const [sessionLog, setSessionLog] = useState<string>('');
  const [theme, setTheme] = useState<'dark' | 'light' | 'matrix'>('dark');
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Theme configurations
  const themes = {
    dark: {
      background: '#111827',
      foreground: '#e5e7eb',
      cursor: '#93c5fd',
      selection: '#374151',
      black: '#000000',
      red: '#ef4444',
      green: '#10b981',
      yellow: '#f59e0b',
      blue: '#3b82f6',
      magenta: '#8b5cf6',
      cyan: '#06b6d4',
      white: '#f3f4f6',
      brightBlack: '#6b7280',
      brightRed: '#f87171',
      brightGreen: '#34d399',
      brightYellow: '#fbbf24',
      brightBlue: '#60a5fa',
      brightMagenta: '#a78bfa',
      brightCyan: '#22d3ee',
      brightWhite: '#ffffff',
    },
    light: {
      background: '#ffffff',
      foreground: '#1f2937',
      cursor: '#3b82f6',
      selection: '#e5e7eb',
      black: '#000000',
      red: '#dc2626',
      green: '#059669',
      yellow: '#d97706',
      blue: '#2563eb',
      magenta: '#7c3aed',
      cyan: '#0891b2',
      white: '#f9fafb',
      brightBlack: '#6b7280',
      brightRed: '#ef4444',
      brightGreen: '#10b981',
      brightYellow: '#f59e0b',
      brightBlue: '#3b82f6',
      brightMagenta: '#8b5cf6',
      brightCyan: '#06b6d4',
      brightWhite: '#ffffff',
    },
    matrix: {
      background: '#000000',
      foreground: '#00ff00',
      cursor: '#00ff00',
      selection: '#003300',
      black: '#000000',
      red: '#00ff00',
      green: '#00ff00',
      yellow: '#00ff00',
      blue: '#00ff00',
      magenta: '#00ff00',
      cyan: '#00ff00',
      white: '#00ff00',
      brightBlack: '#006600',
      brightRed: '#00ff00',
      brightGreen: '#00ff00',
      brightYellow: '#00ff00',
      brightBlue: '#00ff00',
      brightMagenta: '#00ff00',
      brightCyan: '#00ff00',
      brightWhite: '#00ff00',
    },
  };

  // Initialize the terminal
  useEffect(() => {
    if (containerRef.current && !termRef.current) {
      const term = new Terminal({
        cursorBlink: true,
        fontSize,
        rows: isFullScreen ? 50 : rows,
        cols: isFullScreen ? 150 : cols,
        theme: themes[theme],
        allowTransparency: true,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      });
      const fitAddon = new FitAddon();
      const webLinks = new WebLinksAddon();
      const searchAddon = new SearchAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(webLinks);
      term.loadAddon(searchAddon);
      term.open(containerRef.current);
      term.focus();
      fitAddon.fit();
      termRef.current = term;
      fitAddonRef.current = fitAddon;
      searchAddonRef.current = searchAddon;

      const resizeObserver = new ResizeObserver(() => {
        // Debounce resize to avoid excessive calls
        setTimeout(() => {
          fitAddon.fit();
          const newCols = term.cols;
          const newRows = term.rows;

          if (newCols && newRows) {
            // Only update if dimensions actually changed
            if (newCols !== cols || newRows !== rows) {
              setCols(newCols);
              setRows(newRows);

              // Notify backend of size change
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                  type: 'resize',
                  rows: newRows,
                  cols: newCols
                }));
              }
            }
          }
        }, 100);
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  // Update theme when changed
  useEffect(() => {
    if (termRef.current) {
      termRef.current.options.theme = themes[theme];
    }
  }, [theme]);

  // Update terminal size when full screen changes
  useEffect(() => {
    if (termRef.current && fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 100);
    }
  }, [isFullScreen]);

  const write = useCallback((data: string) => {
    termRef.current?.write(data);
    setSessionLog(prev => prev + data);
  }, []);

  const connect = useCallback((isReconnect = false) => {
    if (status === 'connecting' || status === 'connected') return;
    const token = localStorage.getItem('auth_token') ?? '';

    let wsUrl: string;
    try {
      const httpTarget = buildApiUrl(`/vps/${instanceId}/ssh`, API_BASE_URL);
      const url = new URL(httpTarget, window.location.origin);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      url.searchParams.set('token', token);
      url.searchParams.set('rows', String(rows));
      url.searchParams.set('cols', String(cols));
      wsUrl = url.toString();
    } catch (err) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/api/vps/${instanceId}/ssh?token=${encodeURIComponent(token)}&rows=${rows}&cols=${cols}`;
      console.warn('Falling back to window-based WebSocket URL due to error constructing URL:', err);
    }

    try {
      console.log('Attempting WebSocket connection to:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      setStatus('connecting');

      ws.onopen = () => {
        setStatus('connected');
        setReconnectAttempts(0);
        setLastActivity(Date.now());
        write(`\r\nConnected as ${connectedUser}@${instanceId}\r\n`);
        
        if (isReconnect) {
          write('\r\n[Terminal reconnected]\r\n');
        }
      };
      ws.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data);
          if (payload.type === 'output') {
            write(payload.data);
            setLastActivity(Date.now());
          } else if (payload.type === 'error') {
            write(`\r\n\x1b[31mError:\x1b[0m ${payload.message}\r\n`);
          } else if (payload.type === 'status') {
            write(`\r\n[${payload.message}]\r\n`);
          } else if (payload.type === 'connected') {
            // noop
          } else if (payload.type === 'close') {
            write(`\r\n[session closed]\r\n`);
            setStatus('disconnected');
          }
        } catch {
          write(String(evt.data || ''));
        }
      };
      ws.onclose = (event) => {
        setStatus('disconnected');
        wsRef.current = null;
        
        // Auto-reconnect logic
        if (!event.wasClean && reconnectAttempts < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect(true);
          }, delay);
        }
      };
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('error');
        write('\r\n\x1b[31mWebSocket connection error\x1b[0m\r\n');
      };

      // Pipe terminal input to WS
      termRef.current?.onData((data) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'input', data }));
        }
      });
    } catch (err) {
      setStatus('error');
      write(`\r\n\x1b[31mFailed to connect:\x1b[0m ${(err as Error).message}\r\n`);
    }
  }, [instanceId, rows, cols, connectedUser, status, write, reconnectAttempts]);

  const disconnect = useCallback(() => {
    try { wsRef.current?.close(); } catch {}
    wsRef.current = null;
    setStatus('disconnected');
  }, []);

  const clear = useCallback(() => {
    termRef.current?.clear();
  }, []);

  const increaseFont = useCallback(() => {
    setFontSize((s) => {
      const next = Math.min(s + 1, 24);
      termRef.current?.options && (termRef.current.options.fontSize = next);
      fitAddonRef.current?.fit();
      return next;
    });
  }, []);

  const decreaseFont = useCallback(() => {
    setFontSize((s) => {
      const next = Math.max(s - 1, 10);
      termRef.current?.options && (termRef.current.options.fontSize = next);
      fitAddonRef.current?.fit();
      return next;
    });
  }, []);

  const copyToClipboard = useCallback(async () => {
    try {
      const selection = termRef.current?.getSelection();
      if (selection) {
        await navigator.clipboard.writeText(selection);
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }, []);

  const pasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'input', data: text }));
      }
    } catch (err) {
      console.error('Failed to paste from clipboard:', err);
    }
  }, []);

  const downloadSessionLog = useCallback(() => {
    const cleanLog = sessionLog.replace(/\x1b\[[0-9;]*m/g, ''); // Remove ANSI codes
    const blob = new Blob([cleanLog], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ssh-session-${instanceId}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [sessionLog, instanceId]);

  const performSearch = useCallback(() => {
    if (searchAddonRef.current && searchTerm) {
      searchAddonRef.current.findNext(searchTerm);
    }
  }, [searchTerm]);

  const clearSearch = useCallback(() => {
    if (searchAddonRef.current) {
      searchAddonRef.current.clearDecorations();
    }
    setSearchTerm('');
    setSearchVisible(false);
  }, []);

  return (
    <div className="space-y-3">
      {/* Connection and Status Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
            status === 'connected' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
            status === 'connecting' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
            status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
            'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
          }`}>
            <div className={`h-2 w-2 rounded-full ${
              status === 'connected' ? 'bg-green-500' :
              status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
              status === 'error' ? 'bg-red-500' :
              'bg-gray-500'
            }`} />
            {status === 'connected' ? `Connected as ${connectedUser}` :
             status === 'connecting' ? 'Connecting...' :
             reconnectAttempts > 0 ? `Reconnecting... (${reconnectAttempts}/5)` :
             status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
          {status === 'connected' && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Last activity: {new Date(lastActivity).toLocaleTimeString()}
            </span>
          )}
          
          <select
            value={connectedUser}
            onChange={(e) => setConnectedUser(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="root">root</option>
            <option value="ubuntu">ubuntu</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          {/* Connection Controls */}
          <button
            onClick={() => connect()}
            disabled={status === 'connecting' || status === 'connected'}
            className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white transition hover:bg-blue-700 disabled:bg-blue-400"
          >
            Connect
          </button>
          <button
            onClick={disconnect}
            disabled={status !== 'connected'}
            className="rounded-md bg-gray-600 px-3 py-1 text-sm text-white transition hover:bg-gray-700 disabled:bg-gray-400"
          >
            Disconnect
          </button>
          
          {/* Theme Selector */}
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as 'dark' | 'light' | 'matrix')}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="matrix">Matrix</option>
          </select>
        </div>
      </div>

      {/* Advanced Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Terminal Controls */}
        <button 
          onClick={clear} 
          className="rounded-md bg-slate-600 px-3 py-1 text-sm text-white transition hover:bg-slate-700"
        >
          Clear
        </button>
        
        {/* Font Size Controls */}
        <div className="flex items-center gap-1">
          <button 
            onClick={decreaseFont} 
            className="rounded-md bg-slate-600 px-2 py-1 text-sm text-white transition hover:bg-slate-700"
          >
            A-
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400 px-1">{fontSize}px</span>
          <button 
            onClick={increaseFont} 
            className="rounded-md bg-slate-600 px-2 py-1 text-sm text-white transition hover:bg-slate-700"
          >
            A+
          </button>
        </div>

        {/* Copy/Paste Controls */}
        <button 
          onClick={copyToClipboard} 
          className="rounded-md bg-indigo-600 px-3 py-1 text-sm text-white transition hover:bg-indigo-700"
          title="Copy selected text"
        >
          Copy
        </button>
        <button 
          onClick={pasteFromClipboard} 
          disabled={status !== 'connected'}
          className="rounded-md bg-indigo-600 px-3 py-1 text-sm text-white transition hover:bg-indigo-700 disabled:bg-indigo-400"
          title="Paste from clipboard"
        >
          Paste
        </button>

        {/* Search Toggle */}
        <button 
          onClick={() => setSearchVisible(!searchVisible)} 
          className={`rounded-md px-3 py-1 text-sm text-white transition ${
            searchVisible ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-600 hover:bg-gray-700'
          }`}
          title="Toggle search"
        >
          Search
        </button>

        {/* Download Session Log */}
        <button 
          onClick={downloadSessionLog} 
          disabled={!sessionLog}
          className="rounded-md bg-green-600 px-3 py-1 text-sm text-white transition hover:bg-green-700 disabled:bg-green-400"
          title="Download session log"
        >
          Download
        </button>
      </div>

      {/* Search Bar */}
      {searchVisible && (
        <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && performSearch()}
            placeholder="Search in terminal..."
            className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <button 
            onClick={performSearch}
            disabled={!searchTerm}
            className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white transition hover:bg-blue-700 disabled:bg-blue-400"
          >
            Find
          </button>
          <button 
            onClick={clearSearch}
            className="rounded-md bg-gray-600 px-3 py-1 text-sm text-white transition hover:bg-gray-700"
          >
            Clear
          </button>
        </div>
      )}

      {/* Terminal Container */}
      <div
        ref={containerRef}
        className={`w-full overflow-hidden rounded-md border border-gray-300 dark:border-gray-700 ${
          isFullScreen 
            ? 'h-full min-h-[600px]' 
            : 'h-[360px] sm:h-[540px]'
        }`}
        style={{ backgroundColor: themes[theme].background }}
      />

      {/* Tips and Info */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        <div className="flex flex-wrap gap-4">
          <span>💡 Tips:</span>
          <span>• Select text and click Copy to copy</span>
          <span>• Use Search button to find text</span>
          <span>• Download saves your session log</span>
          <span>• Try different themes for better visibility</span>
        </div>
      </div>
    </div>
  );
};

export default SSHTerminal;