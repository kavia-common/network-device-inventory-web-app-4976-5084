'use strict';

/**
 * Simulated ping utility.
 * In constrained environments, raw ICMP is often not permitted.
 * This function randomly marks a device as online/offline and returns a fake response time.
 */

// PUBLIC_INTERFACE
async function pingHost(ip) {
  /** Returns { status: 'online'|'offline', response_time_ms?: number, timestamp } */
  // Simple deterministic pseudo-random based on IP for stability
  const now = new Date();
  const hash = ip.split('.').reduce((acc, n) => acc + parseInt(n, 10), 0);
  const online = (hash + now.getMinutes()) % 2 === 0;
  const responseTime = online ? Math.floor(10 + (hash % 40)) : undefined;
  return {
    status: online ? 'online' : 'offline',
    response_time_ms: responseTime,
    timestamp: now.toISOString(),
  };
}

module.exports = { pingHost };
