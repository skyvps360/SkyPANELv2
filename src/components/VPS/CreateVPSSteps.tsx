/**
 * CreateVPSSteps Component
 * Dynamic step renderer for VPS creation modal that adapts based on provider type
 */

import React from "react";
import type { CreateVPSForm } from "@/types/vps";
import type { ProviderType } from "@/types/provider";

// Linode components
import LazyOSSelection from "@/components/VPS/LazyOSSelection";
import LazyDeploymentSelection from "@/components/VPS/LazyDeploymentSelection";
import LazyStackScriptConfig from "@/components/VPS/LazyStackScriptConfig";

// DigitalOcean components
import DigitalOceanMarketplace from "@/components/VPS/DigitalOceanMarketplace";
import DigitalOceanOSSelection from "@/components/VPS/DigitalOceanOSSelection";
import DigitalOceanConfiguration from "@/components/VPS/DigitalOceanConfiguration";

interface CreateVPSStepsProps {
  step: number;
  providerType: ProviderType;
  formData: CreateVPSForm;
  onFormChange: (updates: Partial<CreateVPSForm>) => void;
  token: string;

  // Linode-specific props
  _linodeImages?: any[];
  linodeStackScripts?: any[];
  selectedStackScript?: any | null;
  onStackScriptSelect?: (script: any | null) => void;
  stackscriptData?: Record<string, any>;
  onStackScriptDataChange?: (data: Record<string, any>) => void;
  allowedImagesDisplay?: string;
  _osGroups?: Record<
    string,
    {
      name: string;
      key: string;
      versions: Array<{ id: string; label: string }>;
    }
  >;
  effectiveOsGroups?: Record<
    string,
    {
      name: string;
      key: string;
      versions: Array<{ id: string; label: string }>;
    }
  >;
  selectedOSGroup?: string | null;
  onOSGroupSelect?: (group: string | null) => void;
  selectedOSVersion?: Record<string, string>;
  onOSVersionSelect?: (key: string, version: string) => void;
  osTab?: "templates" | "iso";
  onOsTabChange?: (tab: "templates" | "iso") => void;
}

export const CreateVPSSteps: React.FC<CreateVPSStepsProps> = ({
  step,
  providerType,
  formData,
  onFormChange,
  token,
  _linodeImages = [],
  linodeStackScripts = [],
  selectedStackScript = null,
  onStackScriptSelect = () => {},
  stackscriptData = {},
  onStackScriptDataChange = () => {},
  allowedImagesDisplay = "",
  _osGroups = {},
  effectiveOsGroups = {},
  selectedOSGroup = null,
  onOSGroupSelect = () => {},
  selectedOSVersion = {},
  onOSVersionSelect = () => {},
  osTab = "templates",
  onOsTabChange = () => {},
}) => {
  // Step 2: Deployment/Marketplace selection
  if (step === 2) {
    if (providerType === "digitalocean") {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Marketplace Apps
            </label>
            <p className="text-sm text-muted-foreground mb-4">
              Optionally deploy a marketplace application.
            </p>
            <DigitalOceanMarketplace
              token={token}
              selectedApp={formData.appSlug || null}
              region={formData.region}
              onSelect={(appSlug: string | null, appData: any) => {
                // When a marketplace app is selected, automatically set the image field
                // When "None" is selected (appSlug is null), clear the image field
                const updates: any = {
                  appSlug,
                  appData,
                };

                // Set image to the marketplace app's image slug if available
                if (appSlug && appData?.image_slug) {
                  updates.image = appData.image_slug;
                } else if (!appSlug) {
                  // Clear image when "None" is selected
                  updates.image = null;
                }

                onFormChange(updates);
              }}
            />
          </div>
        </div>
      );
    } else {
      // Linode: StackScripts
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              1-Click Deployments (Optional)
            </label>
            <LazyDeploymentSelection
              stackScripts={linodeStackScripts}
              selectedStackScript={selectedStackScript}
              onStackScriptSelect={onStackScriptSelect}
            />
          </div>

          <LazyStackScriptConfig
            selectedStackScript={selectedStackScript}
            stackscriptData={stackscriptData}
            onStackScriptDataChange={onStackScriptDataChange}
            allowedImagesDisplay={allowedImagesDisplay}
          />
        </div>
      );
    }
  }

  // Step 3: OS selection
  if (step === 3) {
    if (providerType === "digitalocean") {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Operating System
            </label>
            <DigitalOceanOSSelection
              token={token}
              selectedImage={formData.image || null}
              onSelect={(imageSlug: string) => {
                onFormChange({ image: imageSlug });
              }}
              compatibleWith={formData.appSlug ? [formData.appSlug] : undefined}
            />
          </div>
        </div>
      );
    } else {
      // Linode: OS selection with tabs
      return (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => onOsTabChange("templates")}
              className={`px-4 py-3 min-h-[48px] text-sm font-medium rounded-md border touch-manipulation transition-colors duration-200 ${
                osTab === "templates"
                  ? "border-primary text-primary bg-primary/10 dark:bg-primary/20"
                  : "border text-muted-foreground bg-secondary hover:bg-secondary/80"
              }`}
              aria-label="Select OS templates"
              aria-pressed={osTab === "templates"}
            >
              Templates
            </button>
            <button
              type="button"
              onClick={() => onOsTabChange("iso")}
              className={`px-4 py-3 min-h-[48px] text-sm font-medium rounded-md border touch-manipulation transition-colors duration-200 ${
                osTab === "iso"
                  ? "border-primary text-primary bg-primary/10 dark:bg-primary/20"
                  : "border text-muted-foreground bg-secondary hover:bg-secondary/80"
              }`}
              aria-label="Select ISO images"
              aria-pressed={osTab === "iso"}
            >
              ISO
            </button>
          </div>

          {osTab === "templates" ? (
            <LazyOSSelection
              osGroups={effectiveOsGroups}
              selectedOSGroup={selectedOSGroup}
              selectedOSVersion={selectedOSVersion}
              onOSGroupSelect={onOSGroupSelect}
              onOSVersionSelect={onOSVersionSelect}
              onImageSelect={(imageId) => onFormChange({ image: imageId })}
            />
          ) : (
            <div className="p-4 border border-dashed border rounded-lg text-sm text-muted-foreground">
              ISO install support coming soon. Use Templates for now.
            </div>
          )}
        </div>
      );
    }
  }

  // Step 4: Configuration/Finalization
  if (step === 4) {
    if (providerType === "digitalocean") {
      return (
        <div className="space-y-4">
          <DigitalOceanConfiguration
            token={token}
            formData={formData}
            onChange={onFormChange}
          />
        </div>
      );
    } else {
      // Linode: Standard configuration (handled in parent for now)
      return null;
    }
  }

  return null;
};
