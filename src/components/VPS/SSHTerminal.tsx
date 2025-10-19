import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import 'xterm/css/xterm.css';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
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

  const statusLabel = status === 'connected'
    ? `Connected as ${connectedUser}`
    : status === 'connecting'
      ? 'Connecting...'
      : reconnectAttempts > 0
        ? `Reconnecting... (${reconnectAttempts}/5)`
        : status.charAt(0).toUpperCase() + status.slice(1);

  const statusBadgeClass = cn(
    'gap-2 border px-3 py-1 text-sm',
    {
      'border-emerald-500/40 bg-emerald-500/10 text-emerald-400': status === 'connected',
      'border-amber-500/40 bg-amber-500/10 text-amber-400': status === 'connecting',
      'border-red-500/40 bg-red-500/10 text-red-400': status === 'error',
      'border-muted bg-muted/30 text-muted-foreground': status === 'disconnected',
    }
  );

  const statusDotClass = cn('h-2 w-2 rounded-full', {
    'bg-emerald-500': status === 'connected',
    'bg-amber-400 animate-pulse': status === 'connecting',
    'bg-red-500': status === 'error',
    'bg-muted-foreground': status === 'disconnected',
  });

  return (
    <div className={cn('flex flex-col space-y-4', isFullScreen && 'h-full')}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className={statusBadgeClass}>
            <span className={statusDotClass} />
            {statusLabel}
          </Badge>
          {status === 'connected' && (
            <span className="text-xs text-muted-foreground">
              Last activity: {new Date(lastActivity).toLocaleTimeString()}
            </span>
          )}
          <Select value={connectedUser} onValueChange={setConnectedUser}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="SSH user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="root">root</SelectItem>
              <SelectItem value="ubuntu">ubuntu</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <Button
            type="button"
            onClick={() => connect()}
            size="sm"
            className="bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-60"
            disabled={status === 'connecting' || status === 'connected'}
          >
            Connect
          </Button>
          <Button
            type="button"
            onClick={disconnect}
            size="sm"
            variant="outline"
            disabled={status !== 'connected'}
          >
            Disconnect
          </Button>
          <Select value={theme} onValueChange={(value) => setTheme(value as 'dark' | 'light' | 'matrix')}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="Theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="matrix">Matrix</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={clear} size="sm" variant="outline">
          Clear
        </Button>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            onClick={decreaseFont}
            size="icon"
            variant="outline"
            className="h-8 w-8"
          >
            A-
          </Button>
          <span className="px-2 text-xs text-muted-foreground">{fontSize}px</span>
          <Button
            type="button"
            onClick={increaseFont}
            size="icon"
            variant="outline"
            className="h-8 w-8"
          >
            A+
          </Button>
        </div>
        <Button type="button" onClick={copyToClipboard} size="sm" variant="secondary">
          Copy
        </Button>
        <Button
          type="button"
          onClick={pasteFromClipboard}
          size="sm"
          variant="secondary"
          disabled={status !== 'connected'}
          className="disabled:opacity-60"
        >
          Paste
        </Button>
        <Button
          type="button"
          onClick={() => setSearchVisible((value) => !value)}
          size="sm"
          variant={searchVisible ? 'default' : 'outline'}
        >
          Search
        </Button>
        <Button
          type="button"
          onClick={downloadSessionLog}
          size="sm"
          className="bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-60"
          disabled={!sessionLog}
        >
          Download
        </Button>
      </div>

      {searchVisible && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && performSearch()}
            placeholder="Search in terminal..."
            className="flex-1 min-w-[200px]"
          />
          <Button type="button" onClick={performSearch} size="sm" disabled={!searchTerm}>
            Find
          </Button>
          <Button type="button" onClick={clearSearch} size="sm" variant="outline">
            Clear
          </Button>
        </div>
      )}

      <div
        ref={containerRef}
        className={cn(
          'flex-1 w-full overflow-hidden rounded-xl border border-border',
          isFullScreen ? 'min-h-[600px]' : 'h-[360px] sm:h-[540px]'
        )}
        style={{ backgroundColor: themes[theme].background }}
      />

      <div className="text-xs text-muted-foreground">
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