/**
 * DigitalOcean Provider Service Implementation
 * Wraps the existing DigitalOceanService with the IProviderService interface
 */

import { BaseProviderService } from './BaseProviderService.js';
import {
  ProviderInstance,
  ProviderPlan,
  ProviderImage,
  ProviderRegion,
  CreateInstanceParams,
} from './IProviderService.js';
import { digitalOceanService } from '../DigitalOceanService.js';
import { normalizeDigitalOceanError } from './errorNormalizer.js';
import { ProviderResourceCache } from '../providerResourceCache.js';
import type {
  DigitalOceanDroplet,
  DigitalOceanSize,
  DigitalOceanImage,
  DigitalOceanRegion,
} from '../DigitalOceanService.js';

export class DigitalOceanProviderService extends BaseProviderService {
  private providerId: string;

  constructor(apiToken: string, providerId?: string) {
    super(apiToken, 'digitalocean');
    this.providerId = providerId || 'digitalocean-default';
  }

  /**
   * Override error handling to use DigitalOcean-specific normalization
   */
  protected handleApiError(error: any, context: string): never {
    console.error(`[digitalocean] ${context}:`, error);
    const normalizedError = normalizeDigitalOceanError(error, 'digitalocean');
    throw normalizedError;
  }

  /**
   * Create a new DigitalOcean Droplet
   */
  async createInstance(params: CreateInstanceParams): Promise<ProviderInstance> {
    this.validateToken();

    try {
      // Build user_data for root password configuration
      let userData = `#cloud-config
password: ${params.rootPassword}
chpasswd: { expire: False }
ssh_pwauth: True`;

      // Add app-specific configuration if provided
      if (params.appData && Object.keys(params.appData).length > 0) {
        userData += `\n# App configuration\n${JSON.stringify(params.appData)}`;
      }

      const createRequest = {
        name: params.label,
        region: params.region,
        size: params.type,
        image: params.image,
        ssh_keys: params.sshKeys?.map(key => Number(key)).filter(k => !isNaN(k)),
        backups: params.backups,
        ipv6: params.ipv6,
        monitoring: params.monitoring,
        tags: params.tags,
        vpc_uuid: params.vpc_uuid,
        user_data: userData,
      };

      const droplet = await digitalOceanService.createDigitalOceanDroplet(this.apiToken, createRequest);
      return this.normalizeInstance(droplet);
    } catch (error) {
      this.handleApiError(error, 'createInstance');
    }
  }

  /**
   * Get a specific DigitalOcean Droplet
   */
  async getInstance(instanceId: string): Promise<ProviderInstance> {
    this.validateToken();

    try {
      const droplet = await digitalOceanService.getDigitalOceanDroplet(this.apiToken, Number(instanceId));
      return this.normalizeInstance(droplet);
    } catch (error) {
      this.handleApiError(error, 'getInstance');
    }
  }

  /**
   * List all DigitalOcean Droplets
   */
  async listInstances(): Promise<ProviderInstance[]> {
    this.validateToken();

    try {
      const droplets = await digitalOceanService.listDigitalOceanDroplets(this.apiToken);
      return droplets.map(droplet => this.normalizeInstance(droplet));
    } catch (error) {
      this.handleApiError(error, 'listInstances');
    }
  }

  /**
   * Perform an action on a DigitalOcean Droplet
   */
  async performAction(instanceId: string, action: string, _params?: Record<string, any>): Promise<void> {
    this.validateToken();

    try {
      const id = Number(instanceId);

      switch (action) {
        case 'boot':
        case 'power_on':
          await digitalOceanService.powerOnDroplet(this.apiToken, id);
          break;
        
        case 'shutdown':
          await digitalOceanService.shutdownDroplet(this.apiToken, id);
          break;
        
        case 'power_off':
          await digitalOceanService.powerOffDroplet(this.apiToken, id);
          break;
        
        case 'reboot':
          await digitalOceanService.rebootDroplet(this.apiToken, id);
          break;
        
        case 'power_cycle':
          await digitalOceanService.powerCycleDroplet(this.apiToken, id);
          break;
        
        case 'delete':
          await digitalOceanService.deleteDigitalOceanDroplet(this.apiToken, id);
          break;
        
        default:
          throw this.createError('INVALID_ACTION', `Unknown action: ${action}`);
      }
    } catch (error) {
      this.handleApiError(error, `performAction:${action}`);
    }
  }

  /**
   * Get available DigitalOcean sizes (plans)
   */
  async getPlans(): Promise<ProviderPlan[]> {
    this.validateToken();

    // Check cache first
    const cached = ProviderResourceCache.getCachedPlans(this.providerId);
    if (cached) {
      return cached;
    }

    try {
      const sizes = await digitalOceanService.getDigitalOceanSizes(this.apiToken);
      const plans = sizes.map(size => this.normalizePlan(size));
      
      // Cache the results
      ProviderResourceCache.setCachedPlans(this.providerId, plans);
      
      return plans;
    } catch (error) {
      this.handleApiError(error, 'getPlans');
    }
  }

  /**
   * Get available DigitalOcean images
   */
  async getImages(): Promise<ProviderImage[]> {
    this.validateToken();

    // Check cache first
    const cached = ProviderResourceCache.getCachedImages(this.providerId);
    if (cached) {
      return cached;
    }

    try {
      const images = await digitalOceanService.getDigitalOceanImages(this.apiToken);
      const normalizedImages = images.map(image => this.normalizeImage(image));
      
      // Cache the results
      ProviderResourceCache.setCachedImages(this.providerId, normalizedImages);
      
      return normalizedImages;
    } catch (error) {
      this.handleApiError(error, 'getImages');
    }
  }

  /**
   * Get available DigitalOcean regions
   */
  async getRegions(): Promise<ProviderRegion[]> {
    this.validateToken();

    // Check cache first
    const cached = ProviderResourceCache.getCachedRegions(this.providerId);
    if (cached) {
      return cached;
    }

    try {
      const regions = await digitalOceanService.getDigitalOceanRegions(this.apiToken);
      const normalizedRegions = regions.map(region => this.normalizeRegion(region));
      
      // Cache the results
      ProviderResourceCache.setCachedRegions(this.providerId, normalizedRegions);
      
      return normalizedRegions;
    } catch (error) {
      this.handleApiError(error, 'getRegions');
    }
  }

  /**
   * Validate DigitalOcean API credentials
   */
  async validateCredentials(): Promise<boolean> {
    try {
      this.validateToken();
      await digitalOceanService.getAccount(this.apiToken);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get marketplace apps (1-Click applications)
   */
  async getMarketplaceApps(): Promise<any[]> {
    this.validateToken();

    // Check cache first
    const cached = ProviderResourceCache.getCachedMarketplace(this.providerId);
    if (cached) {
      return cached;
    }

    try {
      const apps = await digitalOceanService.get1ClickApps(this.apiToken);
      
      // Cache the results
      ProviderResourceCache.setCachedMarketplace(this.providerId, apps);
      
      return apps;
    } catch (error) {
      this.handleApiError(error, 'getMarketplaceApps');
    }
  }

  /**
   * Normalize DigitalOcean Droplet to common format
   */
  private normalizeInstance(droplet: DigitalOceanDroplet): ProviderInstance {
    const ipv4Addresses = droplet.networks?.v4
      ?.filter(net => net.type === 'public')
      .map(net => net.ip_address) || [];

    const ipv6Address = droplet.networks?.v6
      ?.find(net => net.type === 'public')
      ?.ip_address;

    return {
      id: String(droplet.id),
      label: droplet.name,
      status: this.normalizeStatus(droplet.status),
      ipv4: ipv4Addresses,
      ipv6: ipv6Address,
      region: droplet.region.slug,
      specs: {
        vcpus: droplet.vcpus,
        memory: droplet.memory,
        disk: droplet.disk,
        transfer: droplet.size.transfer,
      },
      created: droplet.created_at,
      image: droplet.image.slug || String(droplet.image.id),
      tags: droplet.tags,
    };
  }

  /**
   * Normalize DigitalOcean size to common format
   */
  private normalizePlan(size: DigitalOceanSize): ProviderPlan {
    return {
      id: size.slug,
      label: size.description || size.slug,
      vcpus: size.vcpus,
      memory: size.memory,
      disk: size.disk,
      transfer: size.transfer,
      price: {
        hourly: size.price_hourly,
        monthly: size.price_monthly,
      },
      regions: size.regions,
    };
  }

  /**
   * Normalize DigitalOcean image to common format
   */
  private normalizeImage(image: DigitalOceanImage): ProviderImage {
    return {
      id: String(image.id),
      slug: image.slug || undefined,
      label: image.name,
      description: image.description,
      distribution: image.distribution,
      public: image.public,
      minDiskSize: image.min_disk_size,
    };
  }

  /**
   * Normalize DigitalOcean region to common format
   */
  private normalizeRegion(region: DigitalOceanRegion): ProviderRegion {
    return {
      id: region.slug,
      label: region.name,
      available: region.available,
      capabilities: region.features,
    };
  }

  /**
   * Normalize DigitalOcean status to common format
   */
  private normalizeStatus(status: string): 'running' | 'stopped' | 'provisioning' | 'rebooting' | 'error' | 'unknown' {
    const statusMap: Record<string, 'running' | 'stopped' | 'provisioning' | 'rebooting' | 'error' | 'unknown'> = {
      'new': 'provisioning',
      'active': 'running',
      'off': 'stopped',
      'archive': 'stopped',
    };

    return statusMap[status.toLowerCase()] || 'unknown';
  }
}
