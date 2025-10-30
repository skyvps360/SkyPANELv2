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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, Search, Store, ShieldCheck, Filter, Package, ChevronLeft, ChevronRight } from "lucide-react";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [goToPageInput, setGoToPageInput] = useState("");

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

  // Pagination calculations
  const totalPages = Math.ceil(filteredApps.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedApps = filteredApps.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setGoToPageInput(""); // Clear go-to-page input when filters change
  }, [searchTerm, categoryFilter]);

  // Adjust current page if it's beyond available pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Clear go-to-page input when page changes through other navigation
  useEffect(() => {
    setGoToPageInput("");
  }, [currentPage]);

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
              Allow or block marketplace applications for provisioning.
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
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Provider</label>
              <Select
                value={selectedProviderId || undefined}
                onValueChange={setSelectedProviderId}
                disabled={loadingProviders || saving || providers.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      loadingProviders ? "Loading providers..." : "Select a provider"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {providers.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No providers found
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

            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Enforce custom marketplace list
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Disable to expose every available marketplace app from the upstream provider.
                    </p>
                  </div>
                  <Switch
                    checked={mode === "custom"}
                    onCheckedChange={(value) => setMode(value ? "custom" : "default")}
                    disabled={loadingApps || saving}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge
                  variant={mode === "custom" ? "default" : "secondary"}
                  className={cn(
                    "font-medium",
                    mode === "custom" && allowedCount === 0 && "bg-destructive text-destructive-foreground"
                  )}
                >
                  {mode === "custom"
                    ? `${allowedCount} app${allowedCount === 1 ? "" : "s"} enabled`
                    : "All marketplace apps enabled"}
                </Badge>
              </div>
              {mode === "custom" && allowedCount === 0 && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <p className="text-sm text-destructive font-medium">
                    ⚠️ No apps enabled
                  </p>
                  <p className="text-xs text-destructive/80 mt-1">
                    Select at least one app to keep provisioning enabled.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={mode !== "custom" || loadingApps || saving || apps.length === 0}
                className="justify-start"
              >
                Enable All Apps
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                disabled={mode !== "custom" || loadingApps || saving || apps.length === 0}
                className="justify-start"
              >
                Disable All Apps
              </Button>
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search marketplace apps..."
                    className="pl-9 pr-4 w-80"
                    disabled={loadingApps}
                  />
                </div>
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                  disabled={loadingApps}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All categories" />
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
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs font-medium px-3 py-1">
                  <Package className="h-3 w-3 mr-1" />
                  {filteredApps.length} total
                </Badge>
                {mode === "custom" && (
                  <Badge variant="outline" className="text-xs font-medium px-3 py-1">
                    {allowedCount} enabled
                  </Badge>
                )}
              </div>
            </div>

            {loadingApps ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="rounded-full bg-primary/10 p-4">
                    <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Loading marketplace apps</p>
                    <p className="text-sm text-muted-foreground">Please wait while we fetch the latest applications...</p>
                  </div>
                </div>
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground">
                <div className="rounded-full bg-muted p-3">
                  <Filter className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium">No marketplace apps found</p>
                  <p className="text-sm">Try adjusting your search or filter criteria</p>
                </div>
                {searchTerm && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchTerm("")}
                    className="mt-2"
                  >
                    Clear search
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {mode === "custom" && (
                          <TableHead className="w-12">
                            <Checkbox
                              checked={paginatedApps.length > 0 && paginatedApps.every(app => app.allowed)}
                              onCheckedChange={(checked) => {
                                if (mode === "custom") {
                                  // Toggle all apps on current page
                                  paginatedApps.forEach(app => {
                                    handleToggleApp(app.slug, !!checked);
                                  });
                                }
                              }}
                              disabled={mode !== "custom" || saving || paginatedApps.length === 0}
                            />
                          </TableHead>
                        )}
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="font-semibold">Application Name</TableHead>
                        <TableHead className="font-semibold">Category</TableHead>
                        <TableHead className="font-semibold">Description</TableHead>
                        <TableHead className="font-semibold text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedApps.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={mode === "custom" ? 6 : 5} className="text-center py-8 text-muted-foreground">
                            No apps on this page
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedApps.map((app) => {
                          const isEnabled = mode === "custom" ? app.allowed : true;
                          const disabled = mode !== "custom" || saving;
                          const normalizedCategory = app.category || "Other";

                          return (
                            <TableRow
                              key={app.slug}
                              className={cn(
                                "cursor-pointer transition-colors hover:bg-muted/50",
                                mode === "custom" && app.allowed && "bg-primary/5",
                                disabled && "cursor-not-allowed opacity-60"
                              )}
                              onClick={() => {
                                if (!disabled) {
                                  handleToggleApp(app.slug, !app.allowed);
                                }
                              }}
                            >
                              {mode === "custom" && (
                                <TableCell>
                                  <Checkbox
                                    checked={app.allowed}
                                    onCheckedChange={(checked) => handleToggleApp(app.slug, !!checked)}
                                    disabled={disabled}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </TableCell>
                              )}
                              <TableCell>
                                <div className={cn(
                                  "flex h-10 w-10 items-center justify-center rounded-lg font-bold text-xs transition-colors",
                                  isEnabled
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "bg-muted text-muted-foreground"
                                )}>
                                  {app.name?.substring(0, 2).toUpperCase() || app.slug?.substring(0, 2).toUpperCase() || "AP"}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <p className="font-medium text-foreground">
                                    {app.name || app.slug}
                                  </p>
                                  <p className="text-xs text-muted-foreground font-mono">
                                    {app.slug}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                  {normalizedCategory}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-md">
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {app.description || "Pre-configured marketplace application ready for deployment"}
                                </p>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={isEnabled ? "default" : "secondary"}
                                  className={cn(
                                    "text-xs font-semibold",
                                    isEnabled
                                      ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                                      : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                                  )}
                                >
                                  {isEnabled ? "Enabled" : "Disabled"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                {filteredApps.length > 0 && (
                  <div className="flex flex-col gap-4 px-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Rows per page:</span>
                        <Select
                          value={itemsPerPage.toString()}
                          onValueChange={(value) => {
                            setItemsPerPage(Number(value));
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="w-16 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredApps.length)} of {filteredApps.length} apps
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Go to page input */}
                      {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Go to page:</span>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="1"
                              max={totalPages}
                              value={goToPageInput}
                              onChange={(e) => setGoToPageInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const pageNum = parseInt(goToPageInput);
                                  if (pageNum >= 1 && pageNum <= totalPages) {
                                    setCurrentPage(pageNum);
                                    setGoToPageInput("");
                                  }
                                }
                              }}
                              placeholder={`1-${totalPages}`}
                              className="w-16 h-8 text-center text-sm"
                              title={`Enter a page number between 1 and ${totalPages}`}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const pageNum = parseInt(goToPageInput);
                                if (pageNum >= 1 && pageNum <= totalPages) {
                                  setCurrentPage(pageNum);
                                  setGoToPageInput("");
                                }
                              }}
                              disabled={!goToPageInput || parseInt(goToPageInput) < 1 || parseInt(goToPageInput) > totalPages}
                              className="h-8 px-2 text-xs"
                            >
                              Go
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }

                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className="h-8 w-8 p-0"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketplaceManager;
