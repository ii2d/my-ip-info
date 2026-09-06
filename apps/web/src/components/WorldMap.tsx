import L from 'leaflet';
import { MapPin, Navigation } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef } from 'react';
import type { ProviderResult } from '../types';

interface WorldMapProps {
  results: ProviderResult[];
}

export const WorldMap: React.FC<WorldMapProps> = ({ results }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Extract all points with valid coordinates
  const geoPoints = results
    .filter(
      (r) =>
        r.status === 'success' &&
        r.geo &&
        typeof r.geo.latitude === 'number' &&
        typeof r.geo.longitude === 'number' &&
        !isNaN(r.geo.latitude) &&
        !isNaN(r.geo.longitude)
    )
    .map((r) => ({
      provider: r.providerName,
      ip: r.ip,
      lat: r.geo!.latitude!,
      lng: r.geo!.longitude!,
      city: r.geo!.city,
      country: r.geo!.country,
      asn: r.geo!.asn,
    }));

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Leaflet map if not already done
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
      }).setView([20, 0], 2);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // OpenStreetMap tile layer with CSS dark invert filter
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        className: 'map-tiles-dark',
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    if (geoPoints.length > 0) {
      const bounds = L.latLngBounds([]);

      geoPoints.forEach((pt) => {
        const latLng = L.latLng(pt.lat, pt.lng);
        bounds.extend(latLng);

        // Custom Neon Pin Marker Icon
        const icon = L.divIcon({
          className: 'custom-map-pin',
          html: `
            <div style="
              width: 14px;
              height: 14px;
              border-radius: 50%;
              background: #6366f1;
              border: 2px solid #ffffff;
              box-shadow: 0 0 12px #6366f1;
              position: relative;
            ">
              <span style="
                position: absolute;
                top: -4px;
                left: -4px;
                right: -4px;
                bottom: -4px;
                border-radius: 50%;
                border: 1px solid #6366f1;
                opacity: 0.7;
              "></span>
            </div>
          `,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const marker = L.marker(latLng, { icon });
        marker.bindPopup(`
          <div style="padding: 4px 6px; font-family: sans-serif;">
            <div style="font-weight: 700; font-size: 13px; color: #f8fafc; margin-bottom: 2px;">
              ${pt.provider}
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">
              ${[pt.city, pt.country].filter(Boolean).join(', ') || 'Reported Location'}
            </div>
            <div style="font-family: monospace; font-size: 11px; color: #38bdf8;">
              ${pt.ip}
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
              Lat: ${pt.lat.toFixed(4)}, Lng: ${pt.lng.toFixed(4)}
            </div>
          </div>
        `);

        markersLayer.addLayer(marker);
      });

      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 10,
        animate: true,
      });
    }

    return () => {
      // clean up on unmount if needed
    };
  }, [geoPoints]);

  return (
    <div className="glass-card" style={{ padding: 'clamp(1.1rem, 3vw, 1.75rem)' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Navigation size={18} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Geolocation Convergence Map</h2>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Visualizes where each provider and geo database resolves your coordinates.
          </p>
        </div>

        {geoPoints.length > 0 ? (
          <span className="badge badge-emerald">
            {geoPoints.length} Geolocation Pin{geoPoints.length > 1 ? 's' : ''} Plotted
          </span>
        ) : (
          <span className="badge badge-amber">Awaiting Geolocation Data</span>
        )}
      </div>

      <div ref={mapContainerRef} className="world-map-container" />
    </div>
  );
};
