import React, { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Terminal as TerminalIcon, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SSHTerminal from '@/components/VPS/SSHTerminal';

const decodeLabel = (value: string | null): string | null => {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const VpsSshConsole: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const instanceLabel = decodeLabel(searchParams.get('label'));

  useEffect(() => {
    const previousTitle = document.title;
    document.title = instanceLabel ? `${instanceLabel} · SSH Console` : 'SSH Console';
    return () => {
      document.title = previousTitle;
    };
  }, [instanceLabel]);

  const handleClose = () => {
    window.close();
    setTimeout(() => {
      if (!window.closed) {
        navigate(-1);
      }
    }, 150);
  };

  if (!id) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center text-sm text-muted-foreground">
        <p>Instance ID unavailable. Close this window and relaunch the SSH console from the dashboard.</p>
        <Button variant="outline" size="sm" onClick={handleClose}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between gap-4 border-b border-border/70 bg-card/95 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <TerminalIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">SSH Console</span>
            <span className="text-sm font-semibold text-foreground">{instanceLabel ?? id}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reload
          </Button>
          <Button type="button" size="sm" variant="destructive" onClick={handleClose}>
            Close Window
          </Button>
        </div>
      </header>
      <main className="flex flex-1 min-h-0 flex-col overflow-hidden p-6">
        <SSHTerminal instanceId={id} isFullScreen fitContainer />
      </main>
    </div>
  );
};

export default VpsSshConsole;
