export const WS_URL = 'ws://127.0.0.1:18789';

// ─── Auth config ─────────────────────────────────────────────────────────────
const GATEWAY_PASSWORD = 'qtclaw';
const DEVICE_TOKEN_KEY = 'openclaw_device_token'; // localStorage key

// ─── Device Identity (from ~/.openclaw/identity/device.json) ─────────────────
const DEVICE_ID = '76c15c77df85cf75cccbdeffd22c89cd5914581e552fd4e11fe1b2ebad52a9b3';
const DEVICE_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA5WtSOxQE8BBymqbhKBx4zJhYKuEyATW2dcuraHjoLhI=
-----END PUBLIC KEY-----`;
const DEVICE_PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIKwVn/TGEEta8rFgK3cuZMZKyfA2NPc/4wZ05Z4MYYEo
-----END PRIVATE KEY-----`;

// ─── Ed25519 helpers ──────────────────────────────────────────────────────────
function base64UrlEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function pemToBytes(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

async function importEd25519PrivateKey(pem) {
  return crypto.subtle.importKey('pkcs8', pemToBytes(pem), { name: 'Ed25519' }, false, ['sign']);
}

async function signDevicePayload(privateKeyPem, payloadStr) {
  const key = await importEd25519PrivateKey(privateKeyPem);
  const sig = await crypto.subtle.sign('Ed25519', key, new TextEncoder().encode(payloadStr));
  return base64UrlEncode(sig);
}

// Build payload: version|deviceId|clientId|clientMode|role|scopes|signedAtMs|token[|nonce]
function buildAuthPayload({ deviceId, clientId, clientMode, role, scopes, signedAtMs, token, nonce }) {
  const version = nonce ? 'v2' : 'v1';
  const parts = [version, deviceId, clientId, clientMode, role, scopes.join(','), String(signedAtMs), token ?? ''];
  if (nonce) parts.push(nonce);
  return parts.join('|');
}

// ─── Device token storage (persists across page reloads) ─────────────────────
function getStoredDeviceToken() {
  try { return localStorage.getItem(DEVICE_TOKEN_KEY) || null; } catch { return null; }
}
function storeDeviceToken(token) {
  try { localStorage.setItem(DEVICE_TOKEN_KEY, token); } catch { }
}
function clearStoredDeviceToken() {
  try { localStorage.removeItem(DEVICE_TOKEN_KEY); } catch { }
}

// ─── OpenClaw WebSocket Service ───────────────────────────────────────────────
class OpenClawService {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.pendingRequests = new Map();
    this.eventListeners = new Set();
    this.heartbeatTimer = null;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }
    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log('WebSocket Opened. Completing Handshake...');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'res' && data.id && this.pendingRequests.has(data.id)) {
          const { resolve, reject } = this.pendingRequests.get(data.id);
          this.pendingRequests.delete(data.id);
          if (data.ok === false && data.error) {
            reject(data.error);
          } else {
            resolve(data.payload);
          }
        } else if (data.type === 'event' && data.event === 'connect.challenge') {
          this.sendConnect(data.payload?.nonce);
        } else {
          this.notifyListeners(data);
        }
      } catch (err) {
        console.error('Failed to parse WS message', err);
      }
    };

    this.ws.onclose = () => {
      console.log('Disconnected from OpenClaw Gateway');
      this.connected = false;
      this.stopHeartbeat();
      this.notifyListeners({ type: 'connection_change', connected: false });
      this.ws = null;
      setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = (err) => console.error('WebSocket Error', err);
  }

  request(method, params = {}) {
    return new Promise((resolve, reject) => {
      const isHandshake = method === 'connect';
      if ((!this.connected && !isHandshake) || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error(`WebSocket not ready (connected: ${this.connected})`));
      }
      const id = Math.random().toString(36).substring(2, 15);
      this.pendingRequests.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ type: 'req', id, method, params }));
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`RPC request "${method}" timed out`));
        }
      }, 10000);
    });
  }

  subscribe(listener) {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  notifyListeners(data) {
    this.eventListeners.forEach(l => l(data));
  }

  startHeartbeat() {
    // Gateway manages its own tick events; no client-side ping needed.
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
  }

  async sendConnect(nonce = null) {
    const role = 'operator';
    const scopes = ['operator.admin', 'operator.approvals', 'operator.pairing'];
    const clientId = 'cli';
    const clientMode = 'cli';

    // Try stored device token first (issued after first successful pairing)
    const storedToken = getStoredDeviceToken();

    try {
      let connectParams;

      if (storedToken) {
        // Fast path: use persisted device token — no signing needed
        connectParams = {
          minProtocol: 3,
          maxProtocol: 3,
          client: { id: clientId, version: '1.0.0', platform: 'web', mode: clientMode },
          role,
          scopes,
          auth: { token: storedToken },
        };
      } else {
        // First-time or token expired: sign with private key + send password
        const signedAt = Date.now();
        const payloadStr = buildAuthPayload({
          deviceId: DEVICE_ID,
          clientId,
          clientMode,
          role,
          scopes,
          signedAtMs: signedAt,
          token: null, // no auth.token when using password mode
          nonce: nonce || undefined,
        });
        const signature = await signDevicePayload(DEVICE_PRIVATE_KEY_PEM, payloadStr);

        connectParams = {
          minProtocol: 3,
          maxProtocol: 3,
          client: { id: clientId, version: '1.0.0', platform: 'web', mode: clientMode },
          role,
          scopes,
          device: {
            id: DEVICE_ID,
            publicKey: DEVICE_PUBLIC_KEY_PEM,
            signature,
            signedAt,
            ...(nonce ? { nonce } : {}),
          },
          auth: { password: GATEWAY_PASSWORD },
        };
      }

      const result = await this.request('connect', connectParams);

      // Persist the device token returned from hello-ok for future connects
      const deviceToken = result?.auth?.deviceToken;
      if (deviceToken) {
        storeDeviceToken(deviceToken);
        console.log('Device token persisted for future connects');
      }

      console.log('Connect Handshake Successful', result);
      this.connected = true;
      this.startHeartbeat();
      this.notifyListeners({ type: 'connection_change', connected: true });
    } catch (err) {
      console.error('Connect Handshake Failed', err);
      // If device token is rejected, clear it so next attempt re-signs
      if (err?.code === 'INVALID_REQUEST' && storedToken) {
        console.log('Clearing stale device token, will re-authenticate next connect');
        clearStoredDeviceToken();
      }
    }
  }

  // --- Convenience Methods ---
  async fetchAgents() { return this.request('agents.list'); }
  async fetchModels() { return this.request('models.list'); }
  async fetchSystemStatus() { return this.request('system.status'); }
  async fetchConfig() { return this.request('config.get', {}); }
  async patchConfig(patch) { return this.request('config.patch', { patch }); }
  async fetchSessions(agentId) { return this.request('sessions.list', agentId ? { agentId } : {}); }
  async sendToAgent(agentId, message) {
    return this.request('agent', { agentId, message, idempotencyKey: Math.random().toString(36).slice(2) });
  }
}

export const openClawApi = new OpenClawService();
