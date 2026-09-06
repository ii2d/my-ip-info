export type IpVersion = 'IPv4' | 'IPv6' | 'Unknown';

export interface GeoLocationInfo {
  city?: string;
  region?: string;
  regionCode?: string;
  country?: string;
  countryCode?: string;
  continent?: string;
  latitude?: number;
  longitude?: number;
  postalCode?: string;
  metroCode?: string;
  timezone?: string;
  asn?: string | number;
  asOrganization?: string;
  colo?: string; // Cloudflare Datacenter IATA code (e.g. SFO, ORD, FRA)
}

export interface ClientHeadersInfo {
  userAgent?: string;
  acceptLanguage?: string;
  referer?: string;
  host?: string;
  protocol?: string;
  tlsVersion?: string;
  tlsCipher?: string;
}

export interface IpInfoResponse {
  ip: string;
  version: IpVersion;
  isBogon: boolean;
  provider: string;
  timestamp: string;
  geo?: GeoLocationInfo;
  headers?: ClientHeadersInfo;
}

export interface CloudflareCfData {
  colo?: string;
  country?: string;
  city?: string;
  region?: string;
  regionCode?: string;
  continent?: string;
  latitude?: string | number;
  longitude?: string | number;
  postalCode?: string;
  metroCode?: string;
  timezone?: string;
  asn?: number;
  asOrganization?: string;
  tlsVersion?: string;
  tlsCipher?: string;
  httpProtocol?: string;
}
