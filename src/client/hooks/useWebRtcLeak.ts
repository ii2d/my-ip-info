import { useCallback, useEffect, useRef, useState } from 'react';
import { isBogonIp } from '../../shared/ip';
import type { WebRtcLeakResult } from '../types';

const REFOCUS_COOLDOWN_MS = 5000;

export function useWebRtcLeak() {
  const [result, setResult] = useState<WebRtcLeakResult>({
    status: 'probing',
    localIps: [],
    publicIps: [],
    hasLeak: false,
    candidates: [],
  });

  const lastProbeTimeRef = useRef<number>(0);
  const isProbingRef = useRef<boolean>(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    // Clean up any ongoing peer connection and timeout
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {
        // ignore
      }
      pcRef.current = null;
    }

    isProbingRef.current = true;
    lastProbeTimeRef.current = Date.now();
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
    pcRef.current = pc;

    // Dummy data channel to force ICE candidate gathering
    pc.createDataChannel('leak-detector');

    const finishGathering = () => {
      isProbingRef.current = false;
      setResult({
        status: 'completed',
        localIps: Array.from(localIpsSet),
        publicIps: Array.from(publicIpsSet),
        hasLeak: publicIpsSet.size > 0 || localIpsSet.size > 0,
        candidates: candidatesList,
      });
    };

    pc.onicecandidate = (event) => {
      if (!event || !event.candidate) {
        // Gathering finished
        finishGathering();
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
        isProbingRef.current = false;
      });

    // Cleanup timeout after 5 seconds
    timerRef.current = setTimeout(() => {
      try {
        pc.close();
      } catch {
        // ignore
      }
      if (pcRef.current === pc) {
        pcRef.current = null;
      }
      finishGathering();
    }, 5000);
  }, []);

  useEffect(() => {
    probe();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (pcRef.current) {
        try {
          pcRef.current.close();
        } catch {
          // ignore
        }
      }
    };
  }, [probe]);

  // Auto-reprobe on page refocus, visibility change, or network reconnect
  useEffect(() => {
    const handleRefocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      if (isProbingRef.current) {
        return;
      }
      if (Date.now() - lastProbeTimeRef.current < REFOCUS_COOLDOWN_MS) {
        return;
      }
      probe();
    };

    window.addEventListener('focus', handleRefocus);
    document.addEventListener('visibilitychange', handleRefocus);
    window.addEventListener('online', handleRefocus);

    return () => {
      window.removeEventListener('focus', handleRefocus);
      document.removeEventListener('visibilitychange', handleRefocus);
      window.removeEventListener('online', handleRefocus);
    };
  }, [probe]);

  return {
    ...result,
    reProbe: probe,
  };
}
