/**
 * Integration Example: DigitalOceanOSSelection in VPS Creation Flow
 * 
 * This example shows how to integrate the DigitalOceanOSSelection component
 * into the VPS creation modal, including:
 * - Conditional rendering based on provider type
 * - Integration with marketplace app selection
 * - Form state management
 */

import DigitalOceanOSSelection from './DigitalOceanOSSelection';
import DigitalOceanMarketplace from './DigitalOceanMarketplace';
import LazyOSSelection from './LazyOSSelection';

interface VPSCreationStepProps {
  step: number;
  providerType: 'linode' | 'digitalocean';
  formData: {
    image: string | null;
    appSlug: string | null;
    appData: any | null;
  };
  onFormChange: (updates: any) => void;
  token: string;
}

export function VPSCreationStepExample({
  step,
  providerType,
  formData,
  onFormChange,
  token
}: VPSCreationStepProps) {
  // Step 2: Marketplace/StackScript Selection
  if (step === 2) {
    if (providerType === 'digitalocean') {
      return (
        <DigitalOceanMarketplace
          selectedApp={formData.appSlug}
          onSelect={(appSlug, appData) => {
            onFormChange({
              appSlug,
              appData,
              // Reset image selection when app changes
              image: null
            });
          }}
          token={token}
        />
      );
    } else {
      // Render Linode StackScript selection
      return <div>Linode StackScript Selection</div>;
    }
  }

  // Step 3: OS Selection
  if (step === 3) {
    if (providerType === 'digitalocean') {
      return (
        <DigitalOceanOSSelection
          selectedImage={formData.image}
          onSelect={(imageSlug) => {
            onFormChange({ image: imageSlug });
          }}
          // Filter by marketplace app compatibility if an app is selected
          compatibleWith={formData.appData?.compatible_images}
          token={token}
        />
      );
    } else {
      // Render Linode OS selection
      return (
        <LazyOSSelection
          osGroups={{}}
          selectedOSGroup={null}
          selectedOSVersion={{}}
          onOSGroupSelect={() => {}}
          onOSVersionSelect={() => {}}
          onImageSelect={(imageId) => {
            onFormChange({ image: imageId });
          }}
        />
      );
    }
  }

  return null;
}

/**
 * Usage in VPS Creation Modal:
 * 
 * ```tsx
 * function CreateVPSModal() {
 *   const [step, setStep] = useState(1);
 *   const [providerType, setProviderType] = useState<'linode' | 'digitalocean'>('linode');
 *   const [formData, setFormData] = useState({
 *     provider_id: '',
 *     provider_type: 'linode',
 *     label: '',
 *     type: '',
 *     region: '',
 *     image: null,
 *     appSlug: null,
 *     appData: null,
 *     rootPassword: '',
 *     sshKeys: [],
 *     backups: false,
 *     privateIP: false,
 *   });
 *   const token = localStorage.getItem('token') || '';
 * 
 *   const handleFormChange = (updates: any) => {
 *     setFormData(prev => ({ ...prev, ...updates }));
 *   };
 * 
 *   return (
 *     <Dialog>
 *       <DialogContent>
 *         <VPSCreationStepExample
 *           step={step}
 *           providerType={providerType}
 *           formData={formData}
 *           onFormChange={handleFormChange}
 *           token={token}
 *         />
 *       </DialogContent>
 *     </Dialog>
 *   );
 * }
 * ```
 */
