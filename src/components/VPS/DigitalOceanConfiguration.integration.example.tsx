/**
 * Integration Example: DigitalOceanConfiguration in VPS Creation Flow
 *
 * This example demonstrates how to integrate the DigitalOceanConfiguration component
 * into the multi-step VPS creation modal, specifically for Step 4 (Finalize & Review).
 */

import { useState } from "react";
import DigitalOceanConfiguration from "./DigitalOceanConfiguration";
import type { CreateVPSForm } from "@/types/vps";
import type { ProviderType } from "@/types/provider";

// Example: Step 4 content in the VPS creation modal
export function Step4DigitalOceanExample() {
  const [createForm, _setCreateForm] = useState<CreateVPSForm>({
    provider_id: "uuid-of-digitalocean-provider",
    provider_type: "digitalocean" as ProviderType,
    label: "my-droplet",
    type: "s-1vcpu-1gb",
    region: "nyc3",
    image: "ubuntu-22-04-x64",
    rootPassword: "",
    sshKeys: [],
    backups: false,
    privateIP: false,
    // DigitalOcean-specific defaults
    monitoring: true,
    ipv6: true,
    vpc_uuid: undefined,
  });

  const token = "your-auth-token"; // From useAuth() hook

  const handleFormChange = (updates: Partial<CreateVPSForm>) => {
    _setCreateForm((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div className="space-y-5">
      <DigitalOceanConfiguration
        formData={createForm}
        onChange={handleFormChange}
        token={token}
        region={createForm.region}
      />
    </div>
  );
}

// Example: Dynamic step rendering based on provider type
export function DynamicStepRendering() {
  const [createForm, setCreateForm] = useState<CreateVPSForm>({
    provider_id: "",
    provider_type: "linode" as ProviderType,
    label: "",
    type: "",
    region: "",
    image: "",
    rootPassword: "",
    sshKeys: [],
    backups: false,
    privateIP: false,
  });

  const [createStep, _setCreateStep] = useState(4);
  const token = "your-auth-token";

  const handleFormChange = (updates: Partial<CreateVPSForm>) => {
    setCreateForm((prev) => ({ ...prev, ...updates }));
  };

  // Step 4: Configuration - Provider-specific rendering
  if (createStep === 4) {
    if (createForm.provider_type === "digitalocean") {
      return (
        <div className="space-y-5">
          <h3 className="text-lg font-semibold">Finalize & Review</h3>
          <p className="text-sm text-muted-foreground">
            Set credentials and optional add-ons before provisioning.
          </p>

          <DigitalOceanConfiguration
            formData={createForm}
            onChange={handleFormChange}
            token={token}
            region={createForm.region}
          />
        </div>
      );
    } else if (createForm.provider_type === "linode") {
      // Render Linode-specific configuration
      return (
        <div className="space-y-5">
          <h3 className="text-lg font-semibold">Finalize & Review</h3>
          <p className="text-sm text-muted-foreground">
            Set credentials and optional add-ons before provisioning.
          </p>

          {/* Linode configuration fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Root Password *
              </label>
              <input
                type="password"
                value={createForm.rootPassword}
                onChange={(e) =>
                  handleFormChange({ rootPassword: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-md"
              />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={createForm.backups}
                  onChange={(e) =>
                    handleFormChange({ backups: e.target.checked })
                  }
                  className="mr-2"
                />
                Enable Backups (+40%)
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={createForm.privateIP}
                  onChange={(e) =>
                    handleFormChange({ privateIP: e.target.checked })
                  }
                  className="mr-2"
                />
                Private IP
              </label>
            </div>
          </div>
        </div>
      );
    }
  }

  return null;
}

// Example: Validation before submission
export function ValidationExample() {
  const validateDigitalOceanConfiguration = (
    formData: CreateVPSForm
  ): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Root password validation
    if (!formData.rootPassword) {
      errors.push("Root password is required");
    } else {
      if (formData.rootPassword.length < 8) {
        errors.push("Password must be at least 8 characters");
      }
      if (!/[A-Z]/.test(formData.rootPassword)) {
        errors.push("Password must contain at least one uppercase letter");
      }
      if (!/[a-z]/.test(formData.rootPassword)) {
        errors.push("Password must contain at least one lowercase letter");
      }
      if (!/[0-9]/.test(formData.rootPassword)) {
        errors.push("Password must contain at least one number");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  };

  const handleCreateInstance = async (formData: CreateVPSForm) => {
    // Validate configuration
    const validation = validateDigitalOceanConfiguration(formData);

    if (!validation.valid) {
      console.error("Validation errors:", validation.errors);
      alert(validation.errors.join("\n"));
      return;
    }

    // Proceed with VPS creation
    try {
      const response = await fetch("/api/vps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider_id: formData.provider_id,
          provider_type: formData.provider_type,
          label: formData.label,
          type: formData.type,
          region: formData.region,
          image: formData.image,
          rootPassword: formData.rootPassword,
          sshKeys: formData.sshKeys,
          backups: formData.backups,
          // DigitalOcean-specific
          monitoring: formData.monitoring,
          ipv6: formData.ipv6,
          vpc_uuid: formData.vpc_uuid,
          // Marketplace app if selected
          appSlug: formData.appSlug,
          appData: formData.appData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create VPS");
      }

      console.log("VPS created successfully:", data);
    } catch (error) {
      console.error("Failed to create VPS:", error);
    }
  };

  const token = "your-auth-token";

  return { validateDigitalOceanConfiguration, handleCreateInstance };
}

// Example: Complete integration in VPS creation modal
export function CompleteIntegrationExample() {
  const [showCreateModal, _setShowCreateModal] = useState(false);
  const [createStep, _setCreateStep] = useState(1);
  const [createForm, setCreateForm] = useState<CreateVPSForm>({
    provider_id: "",
    provider_type: "linode" as ProviderType,
    label: "",
    type: "",
    region: "",
    image: "",
    rootPassword: "",
    sshKeys: [],
    backups: false,
    privateIP: false,
  });

  const token = "your-auth-token";
  const totalSteps = 4;

  const handleFormChange = (updates: Partial<CreateVPSForm>) => {
    setCreateForm((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    _setCreateStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const handleBack = () => {
    _setCreateStep((prev) => Math.max(1, prev - 1));
  };

  const creationSteps = [
    {
      id: "plan",
      title: "Plan & Label",
      content: <div>Step 1 content...</div>,
    },
    {
      id: "deployments",
      title: "1-Click Deployments",
      content: <div>Step 2 content...</div>,
    },
    {
      id: "os",
      title: "Operating System",
      content: <div>Step 3 content...</div>,
    },
    {
      id: "finalize",
      title: "Finalize & Review",
      content: (
        <div className="space-y-5">
          {createForm.provider_type === "digitalocean" ? (
            <DigitalOceanConfiguration
              formData={createForm}
              onChange={handleFormChange}
              token={token}
              region={createForm.region}
            />
          ) : (
            // Linode configuration
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Root Password *
                </label>
                <input
                  type="password"
                  value={createForm.rootPassword}
                  onChange={(e) =>
                    handleFormChange({ rootPassword: e.target.value })
                  }
                  className="w-full px-4 py-3 border rounded-md"
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={createForm.backups}
                    onChange={(e) =>
                      handleFormChange({ backups: e.target.checked })
                    }
                    className="mr-2"
                  />
                  Enable Backups (+40%)
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={createForm.privateIP}
                    onChange={(e) =>
                      handleFormChange({ privateIP: e.target.checked })
                    }
                    className="mr-2"
                  />
                  Private IP
                </label>
              </div>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      {showCreateModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>{creationSteps[createStep - 1].title}</h2>
            {creationSteps[createStep - 1].content}

            <div className="modal-footer">
              {createStep > 1 && <button onClick={handleBack}>Back</button>}
              {createStep < totalSteps && (
                <button onClick={handleNext}>Next</button>
              )}
              {createStep === totalSteps && (
                <button onClick={() => console.log("Create VPS")}>
                  Create VPS
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
