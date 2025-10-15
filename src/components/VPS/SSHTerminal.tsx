import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SearchAddon } from 'xterm-addon-search';
import 'xterm/css/xterm.css';

interface SSHTerminalProps {
  instanceId: string;
}

type WSStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export const SSHTerminal: React.FC<SSHTerminalProps> = ({ instanceId }) => {
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

  // Initialize the terminal
  useEffect(() => {
    if (containerRef.current && !termRef.current) {
      const term = new Terminal({
        cursorBlink: true,
        fontSize,
        rows,
        cols,
        theme: {
          background: '#111827',
          foreground: '#e5e7eb',
          cursor: '#93c5fd',
        },
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
        fitAddon.fit();
        const dims = term._core?._renderService?.dimensions;
        const newCols = Math.max(40, Math.floor((containerRef.current!.clientWidth - 16) / (dims?.actualCellWidth || 9)));
        const newRows = Math.max(10, Math.floor((containerRef.current!.clientHeight - 16) / (dims?.actualCellHeight || 18)));
        setCols(newCols);
        setRows(newRows);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'resize', rows: newRows, cols: newCols }));
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  const write = useCallback((data: string) => {
    termRef.current?.write(data);
  }, []);

  const connect = useCallback(() => {
    if (status === 'connecting' || status === 'connected') return;
    const token = localStorage.getItem('auth_token');
    const base = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const wsUrl = base.replace(/^http/, 'ws') + `/vps/${instanceId}/ssh?token=${encodeURIComponent(String(token || ''))}&rows=${rows}&cols=${cols}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      setStatus('connecting');

      ws.onopen = () => {
        setStatus('connected');
        write(`\r\nConnected as ${connectedUser}@${instanceId}\r\n`);
      };
      ws.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data);
          if (payload.type === 'output') {
            write(payload.data);
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
      ws.onclose = () => {
        setStatus('disconnected');
        wsRef.current = null;
      };
      ws.onerror = () => {
        setStatus('error');
        write('\r\n\x1b[31mWebSocket error\x1b[0m\r\n');
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
  }, [instanceId, rows, cols, connectedUser, status, write]);

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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">Status: {status}</span>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={connectedUser}
            onChange={(e) => setConnectedUser(e.target.value)}
            className="text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1"
          >
            <option value="root">root</option>
            <option value="ubuntu">ubuntu</option>
          </select>
          <button onClick={connect} disabled={status === 'connecting' || status === 'connected'} className="px-2 py-1 text-sm rounded-md bg-blue-600 text-white disabled:bg-blue-400">Connect</button>
          <button onClick={disconnect} disabled={status !== 'connected'} className="px-2 py-1 text-sm rounded-md bg-gray-600 text-white disabled:bg-gray-400">Disconnect</button>
          <button onClick={clear} className="px-2 py-1 text-sm rounded-md bg-slate-700 text-white">Clear</button>
          <button onClick={decreaseFont} className="px-2 py-1 text-sm rounded-md bg-slate-600 text-white">A-</button>
          <button onClick={increaseFont} className="px-2 py-1 text-sm rounded-md bg-slate-600 text-white">A+</button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="h-[540px] w-full rounded-md border border-gray-300 dark:border-gray-700 bg-black/95 overflow-hidden"
      />
      <div className="text-xs text-gray-500 dark:text-gray-400">
        Tips: Ctrl+F to search, click links to open in a new tab, use A+/A- to adjust font.
      </div>
    </div>
  );
};

export default SSHTerminal;