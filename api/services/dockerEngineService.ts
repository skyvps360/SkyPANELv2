import Docker, { ContainerCreateOptions, ContainerInfo as DockerContainerInfo, ContainerInspectInfo, ServiceInspectInfo } from 'dockerode';
import { promisify } from 'util';
import stream from 'stream';

export interface NormalizedContainer {
  id: string;
  dockerId: string;
  name: string;
  image: string;
  state: string;
  status: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  ports: Array<{
    private: number;
    public?: number;
    type: string;
    ip?: string;
  }>;
  mounts: Array<{
    type: string;
    source?: string;
    destination: string;
    mode?: string;
    rw?: boolean;
  }>;
  labels: Record<string, string>;
  nodeId?: string;
}

export interface CreateDockerContainerRequest {
  name: string;
  image: string;
  env?: Record<string, string>;
  command?: string | string[];
  restartPolicy?: 'no' | 'always' | 'unless-stopped' | 'on-failure';
  ports?: Array<{
    containerPort: number;
    hostPort?: number;
    protocol?: 'tcp' | 'udp';
    hostIp?: string;
  }>;
  volumes?: Array<{
    source?: string;
    target: string;
    readOnly?: boolean;
    type?: 'bind' | 'volume' | 'tmpfs';
  }>;
  autoStart?: boolean;
}

export interface NormalizedNode {
  id: string;
  hostname: string;
  role: string;
  availability: string;
  status: string;
  addr?: string;
  updatedAt: string;
}

const finished = promisify(stream.finished);

function createDockerClient(): Docker {
  const socketPath = process.env.DOCKER_SOCKET || '/var/run/docker.sock';
  if (process.env.DOCKER_HOST) {
    const config: Docker.DockerOptions = {
      host: process.env.DOCKER_HOST,
      port: process.env.DOCKER_PORT ? Number(process.env.DOCKER_PORT) : undefined,
      protocol: process.env.DOCKER_TLS_VERIFY === '1' ? 'https' : 'http',
    };

    if (process.env.DOCKER_TLS_VERIFY === '1') {
      config.ca = process.env.DOCKER_CA ? Buffer.from(process.env.DOCKER_CA, 'base64') : undefined;
      config.cert = process.env.DOCKER_CERT ? Buffer.from(process.env.DOCKER_CERT, 'base64') : undefined;
      config.key = process.env.DOCKER_KEY ? Buffer.from(process.env.DOCKER_KEY, 'base64') : undefined;
    }

    return new Docker(config);
  }

  return new Docker({ socketPath });
}

class DockerEngineService {
  private docker: Docker;

  constructor() {
    this.docker = createDockerClient();
  }

  private normalizeName(name?: string | string[]): string {
    if (!name) return '';
    if (Array.isArray(name)) {
      return name[0]?.replace(/^\//, '') ?? '';
    }
    return name.replace(/^\//, '');
  }

  async ping(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch (err) {
      console.warn('Docker ping failed', err);
      return false;
    }
  }

  async ensureImage(image: string): Promise<void> {
    try {
      await this.docker.getImage(image).inspect();
    } catch {
      const pullStream = await this.docker.pull(image);
      await finished(pullStream);
    }
  }

  private normalizePorts(info: DockerContainerInfo | ContainerInspectInfo): NormalizedContainer['ports'] {
    const ports: NormalizedContainer['ports'] = [];
    if ('Ports' in info && Array.isArray(info.Ports)) {
      for (const port of info.Ports) {
        ports.push({
          private: port.PrivatePort,
          public: port.PublicPort,
          type: port.Type,
          ip: port.IP,
        });
      }
    } else if ('NetworkSettings' in info && info.NetworkSettings?.Ports) {
      for (const [key, bindings] of Object.entries(info.NetworkSettings.Ports)) {
        const [containerPort, type] = key.split('/');
        if (bindings) {
          for (const binding of bindings) {
            ports.push({
              private: Number(containerPort),
              public: binding.HostPort ? Number(binding.HostPort) : undefined,
              type,
              ip: binding.HostIp,
            });
          }
        } else {
          ports.push({
            private: Number(containerPort),
            type,
          });
        }
      }
    }
    return ports;
  }

  private normalizeMounts(info: ContainerInspectInfo): NormalizedContainer['mounts'] {
    if (!Array.isArray(info.Mounts)) return [];
    return info.Mounts.map((mount) => ({
      type: mount.Type,
      source: mount.Source,
      destination: mount.Destination,
      mode: mount.Mode,
      rw: mount.RW,
    }));
  }

  private normalizeContainer(info: DockerContainerInfo | ContainerInspectInfo): NormalizedContainer {
    const name = this.normalizeName('Names' in info ? info.Names?.[0] : info.Name);
    const id = info.Id;
    const state = 'State' in info ? info.State?.Status ?? info.State : info.State;
    const status = 'Status' in info ? info.Status ?? '' : info.State?.Status ?? '';
    const createdRaw = (info as any).Created;
    let createdAt = new Date();
    if (typeof createdRaw === 'number') {
      createdAt = new Date(createdRaw * 1000);
    } else if (typeof createdRaw === 'string') {
      createdAt = new Date(createdRaw);
    }
    const ports = this.normalizePorts(info);
    const labels = 'Labels' in info && info.Labels ? info.Labels : ('Config' in info && info.Config?.Labels ? info.Config.Labels : {});

    return {
      id,
      dockerId: id,
      name,
      image: 'Image' in info ? info.Image : info.Config?.Image ?? '',
      state: typeof state === 'string' ? state : '',
      status,
      createdAt: createdAt.toISOString(),
      startedAt: 'State' in info && info.State?.StartedAt ? info.State.StartedAt : undefined,
      finishedAt: 'State' in info && info.State?.FinishedAt ? info.State.FinishedAt : undefined,
      ports,
      mounts: 'Mounts' in info ? this.normalizeMounts(info as ContainerInspectInfo) : [],
      labels,
      nodeId: 'Node' in info ? info.Node?.ID : undefined,
    };
  }

  async listContainers(includeAll = true): Promise<NormalizedContainer[]> {
    const containers = await this.docker.listContainers({ all: includeAll });
    return containers.map((info) => this.normalizeContainer(info));
  }

  async inspectContainer(id: string): Promise<NormalizedContainer | null> {
    try {
      const container = this.docker.getContainer(id);
      const info = await container.inspect();
      const normalized = this.normalizeContainer(info);
      normalized.mounts = this.normalizeMounts(info);
      return normalized;
    } catch (err) {
      console.warn(`inspectContainer failed for ${id}`, err);
      return null;
    }
  }

  async createContainer(payload: CreateDockerContainerRequest): Promise<NormalizedContainer> {
    const options: ContainerCreateOptions = {
      Image: payload.image,
      name: payload.name,
      Env: payload.env ? Object.entries(payload.env).map(([key, value]) => `${key}=${value}`) : undefined,
      Cmd: payload.command
        ? (Array.isArray(payload.command)
            ? payload.command
            : payload.command.split(' '))
        : undefined,
      HostConfig: {},
    };

    if (payload.restartPolicy) {
      options.HostConfig = options.HostConfig || {};
      options.HostConfig.RestartPolicy = {
        Name: payload.restartPolicy,
      };
    }

    if (payload.ports?.length) {
      options.ExposedPorts = {};
      options.HostConfig = options.HostConfig || {};
      options.HostConfig.PortBindings = {};
      for (const port of payload.ports) {
        const proto = port.protocol ?? 'tcp';
        const key = `${port.containerPort}/${proto}`;
        options.ExposedPorts[key] = {};
        if (!options.HostConfig.PortBindings[key]) {
          options.HostConfig.PortBindings[key] = [];
        }
        options.HostConfig.PortBindings[key]!.push({
          HostPort: port.hostPort ? String(port.hostPort) : undefined,
          HostIp: port.hostIp,
        });
      }
    }

    if (payload.volumes?.length) {
      options.HostConfig = options.HostConfig || {};
      options.HostConfig.Binds = payload.volumes
        .filter((vol) => vol.source)
        .map((vol) => `${vol.source}:${vol.target}${vol.readOnly ? ':ro' : ''}`);

      if (payload.volumes.some((vol) => vol.type === 'tmpfs')) {
        options.HostConfig.Tmpfs = Object.fromEntries(
          payload.volumes
            .filter((vol) => vol.type === 'tmpfs')
            .map((vol) => [vol.target, vol.readOnly ? 'ro' : 'rw'])
        );
      }
    }

    await this.ensureImage(payload.image);
    const container = await this.docker.createContainer(options);

    if (payload.autoStart) {
      await container.start();
    }

    const info = await container.inspect();
    const normalized = this.normalizeContainer(info);
    normalized.mounts = this.normalizeMounts(info);
    return normalized;
  }

  async startContainer(id: string): Promise<void> {
    const container = this.docker.getContainer(id);
    await container.start();
  }

  async stopContainer(id: string): Promise<void> {
    const container = this.docker.getContainer(id);
    await container.stop();
  }

  async restartContainer(id: string): Promise<void> {
    const container = this.docker.getContainer(id);
    await container.restart();
  }

  async removeContainer(id: string, force = false): Promise<void> {
    const container = this.docker.getContainer(id);
    await container.remove({ force });
  }

  async listSwarmNodes(): Promise<NormalizedNode[]> {
    try {
      const nodes = await this.docker.listNodes();
      return nodes.map((node) => ({
        id: node.ID,
        hostname: node.Description?.Hostname ?? node.ID,
        role: node.Spec?.Role ?? 'worker',
        availability: node.Spec?.Availability ?? 'active',
        status: node.Status?.State ?? 'unknown',
        addr: node.Status?.Addr,
        updatedAt: node.UpdatedAt,
      }));
    } catch (err) {
      console.warn('Unable to list swarm nodes', err);
      return [];
    }
  }

  async setNodeAvailability(id: string, availability: 'active' | 'pause' | 'drain'): Promise<void> {
    const node = this.docker.getNode(id);
    const info = await node.inspect();
    const spec = info.Spec || {};
    const version = info.Version?.Index;
    spec.Availability = availability;
    await node.update({
      ...spec,
      Availability: availability,
      Role: spec.Role || info.Spec?.Role || 'worker',
    }, version);
  }

  async inspectService(id: string): Promise<ServiceInspectInfo | null> {
    try {
      const service = this.docker.getService(id);
      return await service.inspect();
    } catch (err) {
      console.warn(`inspectService failed for ${id}`, err);
      return null;
    }
  }
}

export const dockerEngineService = new DockerEngineService();
