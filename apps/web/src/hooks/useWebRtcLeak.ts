import { isBogonIp } from '@my-ip/core';
import { useCallback, useEffect, useState } from 'react';
import type { WebRtcLeakResult } from '../types';

export function useWebRtcLeak() {
  const [result, setResult] = useState<WebRtcLeakResult>({
    status: 'probing',
    localIps: [],
    publicIps: [],
    hasLeak: false,
    candidates: [],
  });

  const probe = useCallback(() => {
    if (typeof window === 'undefined' || !window.RTCPeerConnection) {
      setResult({
        status: 'unsupported',
        localIps: [],
        publicIps: [],
        hasLeak: false,
        candidates: [],
      });
      return;
    }

    setResult((prev) => ({ ...prev, status: 'probing' }));

    const localIpsSet = new Set<string>();
    const publicIpsSet = new Set<string>();
    const candidatesList: WebRtcLeakResult['candidates'] = [];

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    // Dummy data channel to force ICE candidate gathering
    pc.createDataChannel('leak-detector');

    pc.onicecandidate = (event) => {
      if (!event || !event.candidate) {
        // Gathering finished
        setResult({
          status: 'completed',
          localIps: Array.from(localIpsSet),
          publicIps: Array.from(publicIpsSet),
          hasLeak: publicIpsSet.size > 0 || localIpsSet.size > 0,
          candidates: candidatesList,
        });
        return;
      }

      const candidateStr = event.candidate.candidate;
      const parts = candidateStr.split(' ');
      if (parts.length > 4) {
        const ip = parts[4];
        const type = parts[7] || 'unknown'; // 'host' (LAN), 'srflx' (STUN WAN), 'relay' (TURN)
        const protocol = parts[2] || 'udp';

        // Check if IP is valid and not mDNS obfuscated (e.g. .local)
        if (ip && !ip.endsWith('.local') && ip.includes('.')) {
          if (isBogonIp(ip)) {
            localIpsSet.add(ip);
          } else {
            publicIpsSet.add(ip);
          }

          candidatesList.push({ ip, type, protocol });
        }
      }
    };

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .catch((err) => {
        console.warn('WebRTC probe offer error:', err);
      });

    // Cleanup timeout after 5 seconds
    const timer = setTimeout(() => {
      pc.close();
      setResult((prev) => ({
        ...prev,
        status: 'completed',
        localIps: Array.from(localIpsSet),
        publicIps: Array.from(publicIpsSet),
        hasLeak: publicIpsSet.size > 0 || localIpsSet.size > 0,
        candidates: candidatesList,
      }));
    }, 5000);

    return () => {
      clearTimeout(timer);
      pc.close();
    };
  }, []);

  useEffect(() => {
    probe();
  }, [probe]);

  return {
    ...result,
    reProbe: probe,
  };
}
