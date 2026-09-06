import type { GeoLocationInfo, IpVersion } from '@my-ip/core';

export type ProviderCategory = 'self-hosted' | 'public' | 'webrtc' | 'custom';

export interface ProviderResult {
  providerId: string;
  providerName: string;
  category: ProviderCategory;
  ip?: string;
  version?: IpVersion;
  latencyMs?: number;
  status: 'loading' | 'success' | 'error';
  errorMessage?: string;
  geo?: GeoLocationInfo;
  rawHeaders?: Record<string, string>;
  protocol?: string;
}

export interface IpProvider {
  id: string;
  name: string;
  category: ProviderCategory;
  description?: string;
  endpointUrl?: string;
  fetchIp: () => Promise<{
    ip: string;
    version?: IpVersion;
    geo?: GeoLocationInfo;
    protocol?: string;
    rawHeaders?: Record<string, string>;
  }>;
}

export interface WebRtcLeakResult {
  status: 'probing' | 'completed' | 'unsupported';
  localIps: string[];
  publicIps: string[];
  hasLeak: boolean; // True if public IP via STUN is revealed or unexpected
  candidates: {
    ip: string;
    type: string;
    protocol: string;
  }[];
}

export interface CustomEndpoint {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  createdAt: string;
}
