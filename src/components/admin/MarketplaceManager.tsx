import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { buildApiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Search, Store, ShieldCheck, Filter } from "lucide-react";

interface MarketplaceManagerProps {
  token: string;
}

interface ProviderSummary {
  id: string;
  name: string;
  type: string;
  active: boolean;
}

interface MarketplaceApp {
  slug: string;
  name: string;
  description?: string;
  category?: string;
  image_slug?: string;
  type?: string;
  allowed: boolean;
}

interface MarketplaceConfigResponse {
  provider: {
    id: string;
    name: string;
    type: string;
  };
  mode: "default" | "custom";
  allowedApps: string[];
  apps: MarketplaceApp[];
}

type MarketplaceMode = "default" | "custom";

type BaselineSnapshot = {
  mode: MarketplaceMode;
  allowed: string[];
};

const normalizeSlug = (value: string): string => value.trim().toLowerCase();

const MarketplaceManager: React.FC<MarketplaceManagerProps> = ({ token }) => {
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [mode, setMode] = useState<MarketplaceMode>("default");
  const [apps, setApps] = useState<MarketplaceApp[]>([]);
  const [baseline, setBaseline] = useState<BaselineSnapshot>({ mode: "default", allowed: [] });
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [loadingApps, setLoadingApps] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const loadProviders = useCallback(async () => {
    if (!token) return;

    try {
      setLoadingProviders(true);
      const response = await fetch(buildApiUrl("/api/admin/providers"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load providers");
      }

      const data = await response.json();
      const digitalOceanProviders: ProviderSummary[] = Array.isArray(data.providers)
        ? data.providers.filter((provider: ProviderSummary) =>
            provider && provider.type?.toLowerCase() === "digitalocean"
          )
        : [];

      setProviders(digitalOceanProviders);

      if (digitalOceanProviders.length > 0) {
        setSelectedProviderId((prev) => {
          const existing = digitalOceanProviders.find((provider) => provider.id === prev);
          return existing ? existing.id : digitalOceanProviders[0].id;
        });
      } else {
        setSelectedProviderId("");
        setApps([]);
      }
    } catch (error: any) {
      console.error("MarketplaceManager providers error:", error);
      toast.error(error.message || "Failed to load providers");
    } finally {
      setLoadingProviders(false);
    }
  }, [token]);

  const loadMarketplaceConfig = useCallback(
    async (providerId: string) => {
      if (!token || !providerId) return;

      try {
        setLoadingApps(true);
        const response = await fetch(
          buildApiUrl(`/api/admin/providers/${providerId}/marketplace`),
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load marketplace apps");
        }

        const data: MarketplaceConfigResponse = await response.json();
        const normalizedAllowed = new Set(
          (data.allowedApps || []).map((slug) => normalizeSlug(slug))
        );

        const mappedApps: MarketplaceApp[] = Array.isArray(data.apps)
          ? data.apps.map((app) => ({
              ...app,
              allowed:
                data.mode === "custom"
                  ? Boolean(app.allowed)
                  : normalizedAllowed.size > 0
                    ? normalizedAllowed.has(normalizeSlug(app.slug))
                    : true,
            }))
          : [];

        setApps(mappedApps);
        setMode(data.mode);
        setBaseline({
          mode: data.mode,
          allowed: Array.from(normalizedAllowed),
        });
      } catch (error: any) {
        console.error("MarketplaceManager config error:", error);
        toast.error(error.message || "Failed to load marketplace configuration");
        setApps([]);
      } finally {
        setLoadingApps(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!token) return;
    loadProviders();
  }, [loadProviders, token]);

  useEffect(() => {
    if (!token || !selectedProviderId) return;
    loadMarketplaceConfig(selectedProviderId);
  }, [loadMarketplaceConfig, selectedProviderId, token]);

  const allowedCount = useMemo(
    () => apps.filter((app) => app.allowed).length,
    [apps]
  );

  const categories = useMemo(() => {
    const unique = new Set<string>();
    apps.forEach((app) => {
      if (app.category) unique.add(app.category);
    });
    return ["all", ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [apps]);

  const filteredApps = useMemo(() => {
    const category = categoryFilter;
    const term = searchTerm.trim().toLowerCase();

    return apps.filter((app) => {
      if (category !== "all" && app.category !== category) {
        return false;
      }

      if (!term) {
        return true;
      }

      const haystack = `${app.name || ""} ${app.description || ""} ${app.slug || ""}`;
      return haystack.toLowerCase().includes(term);
    });
  }, [apps, categoryFilter, searchTerm]);

  const draftSnapshot = useMemo<BaselineSnapshot>(() => {
    if (mode === "default") {
      return { mode: "default", allowed: [] };
    }

    return {
      mode: "custom",
      allowed: apps
        .filter((app) => app.allowed)
        .map((app) => normalizeSlug(app.slug))
        .sort(),
    };
  }, [apps, mode]);

  const hasChanges = useMemo(() => {
    if (draftSnapshot.mode !== baseline.mode) {
      return true;
    }

    if (draftSnapshot.mode === "default") {
      return baseline.mode !== "default" || baseline.allowed.length > 0;
    }

    if (draftSnapshot.allowed.length !== baseline.allowed.length) {
      return true;
    }

    return draftSnapshot.allowed.some((slug, index) => slug !== baseline.allowed[index]);
  }, [baseline, draftSnapshot]);

  const handleToggleApp = (slug: string, value: boolean) => {
    if (mode !== "custom") return;

    setApps((current) =>
      current.map((app) =>
        app.slug === slug
          ? {
              ...app,
              allowed: value,
            }
          : app
      )
    );
  };

  const handleSelectAll = () => {
    if (mode !== "custom") return;
    setApps((current) => current.map((app) => ({ ...app, allowed: true })));
  };

  const handleClearAll = () => {
    if (mode !== "custom") return;
    setApps((current) => current.map((app) => ({ ...app, allowed: false })));
  };

  const handleSave = async () => {
    if (!token || !selectedProviderId) {
      toast.error("Select a provider first");
      return;
    }

    if (mode === "custom" && allowedCount === 0) {
      toast.error("Select at least one marketplace app before saving");
      return;
    }

    try {
      setSaving(true);
      const payload =
        mode === "default"
          ? { mode: "default", apps: [] }
          : {
              mode: "custom",
              apps: apps.filter((app) => app.allowed).map((app) => app.slug),
            };

      const response = await fetch(
        buildApiUrl(`/api/admin/providers/${selectedProviderId}/marketplace`),
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update marketplace apps");
      }

      const data = await response.json().catch(() => ({ success: true }));
      toast.success(data.message || "Marketplace apps updated");
      await loadMarketplaceConfig(selectedProviderId);
    } catch (error: any) {
      console.error("MarketplaceManager save error:", error);
      toast.error(error.message || "Failed to update marketplace apps");
    } finally {
      setSaving(false);
    }
  };

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Marketplace Controls</CardTitle>
          <CardDescription>
            Sign in as an administrator to manage marketplace availability.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-foreground">
              Marketplace Controls
            </CardTitle>
            <CardDescription>
              Allow or block DigitalOcean marketplace applications for provisioning.
            </CardDescription>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (selectedProviderId) {
                loadMarketplaceConfig(selectedProviderId);
              }
            }}
            disabled={!selectedProviderId || loadingApps || saving}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", loadingApps && "animate-spin")} />
            Refresh
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedProviderId || saving || !hasChanges}
            className="gap-2"
          >
            <ShieldCheck className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Provider</span>
              <Select
                value={selectedProviderId || undefined}
                onValueChange={setSelectedProviderId}
                disabled={loadingProviders || saving || providers.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      loadingProviders ? "Loading providers" : "Select a provider"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {providers.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No DigitalOcean providers
                    </SelectItem>
                  ) : (
                    providers.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Enforce custom marketplace list
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Disable to expose every marketplace app from DigitalOcean.
                  </p>
                </div>
                <Switch
                  checked={mode === "custom"}
                  onCheckedChange={(value) => setMode(value ? "custom" : "default")}
                  disabled={loadingApps || saving}
                />
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="gap-1">
                {mode === "custom"
                  ? `${allowedCount} app${allowedCount === 1 ? "" : "s"} enabled`
                  : "All marketplace apps enabled"}
              </Badge>
              {mode === "custom" && allowedCount === 0 && (
                <p className="text-destructive">
                  Select at least one app to keep provisioning enabled.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={mode !== "custom" || loadingApps || saving || apps.length === 0}
              >
                Enable All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                disabled={mode !== "custom" || loadingApps || saving || apps.length === 0}
              >
                Disable All
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search marketplace apps"
                  className="pl-9"
                  disabled={loadingApps}
                />
              </div>
              <Select
                value={categoryFilter}
                onValueChange={setCategoryFilter}
                disabled={loadingApps}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category === "all" ? "All categories" : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="h-[520px] pr-3 lg:h-[620px]">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {loadingApps ? (
                  <div className="col-span-full flex items-center justify-center py-10 text-muted-foreground">
                    Loading marketplace apps...
                  </div>
                ) : filteredApps.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
                    <Filter className="h-5 w-5" />
                    <p>No marketplace apps match the current filters.</p>
                    {searchTerm && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setSearchTerm("")}
                        className="h-auto p-0"
                      >
                        Clear search
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredApps.map((app) => {
                    const isEnabled = mode === "custom" ? app.allowed : true;
                    const disabled = mode !== "custom" || saving;
                    const normalizedCategory = app.category || "Other";

                    return (
                      <button
                        key={app.slug}
                        type="button"
                        onClick={() => handleToggleApp(app.slug, !app.allowed)}
                        disabled={disabled}
                        className={cn(
                          "relative flex h-full flex-col gap-3 rounded-lg border p-4 text-left transition",
                          mode === "custom"
                            ? app.allowed
                              ? "border-primary/80 bg-primary/5"
                              : "border-border hover:border-primary/40"
                            : "border-border"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary font-semibold">
                              {app.name?.substring(0, 2).toUpperCase() || "--"}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {app.name || app.slug}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {normalizedCategory}
                              </p>
                            </div>
                          </div>
                          {mode === "custom" && (
                            <Badge
                              className={cn(
                                "pointer-events-none text-xs font-semibold",
                                isEnabled
                                  ? "border-primary/70 bg-primary/80 text-primary-foreground"
                                  : "border-transparent bg-muted text-muted-foreground"
                              )}
                            >
                              {isEnabled ? "Enabled" : "Disabled"}
                            </Badge>
                          )}
                        </div>
                        <p className="line-clamp-3 text-xs text-muted-foreground">
                          {app.description || "Marketplace application"}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketplaceManager;
