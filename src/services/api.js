export const WS_URL = 'ws://127.0.0.1:18789';
export const AUTH_TOKEN = '7c974556ac13b2c83558d9cb1bd44e41138d5c66d0d0bcdf';

class OpenClawService {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.pendingRequests = new Map();
    this.requestId = 0;
    this.eventListeners = new Set();
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    // Connect with the token in the query params or however the gateway expects it.
    // Usually, tokens are passed via headers (not possible in browser WS), query params, or a first auth message.
    // Assuming the Gateway Token is passed as a query param or protocol. We'll try query param first.
    this.ws = new WebSocket(`${WS_URL}?token=${AUTH_TOKEN}`);

    this.ws.onopen = () => {
      console.log('Connected to OpenClaw Gateway');
      this.connected = true;
      this.notifyListeners({ type: 'connection_change', connected: true });
      
      // Some systems require an auth message. We'll leave room for it if needed.
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle RPC Responses
        if (data.id && this.pendingRequests.has(data.id)) {
          const { resolve, reject } = this.pendingRequests.get(data.id);
          this.pendingRequests.delete(data.id);
          
          if (data.error) {
            reject(data.error);
          } else {
            resolve(data.result);
          }
        } else {
          // Handle server-pushed events/logs
          this.notifyListeners(data);
        }
      } catch (err) {
        console.error('Failed to parse WS message', err);
      }
    };

    this.ws.onclose = () => {
      console.log('Disconnected from OpenClaw Gateway');
      this.connected = false;
      this.notifyListeners({ type: 'connection_change', connected: false });
      
      // Auto reconnect
      setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket Error', err);
    };
  }

  request(method, params = {}) {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error('WebSocket is not connected'));
      }

      this.requestId++;
      const id = this.requestId.toString();
      
      this.pendingRequests.set(id, { resolve, reject });

      const payload = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };

      this.ws.send(JSON.stringify(payload));

      // Timeout request after 10s
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`RPC request ${method} timed out`));
        }
      }, 10000);
    });
  }

  subscribe(listener) {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  notifyListeners(data) {
    this.eventListeners.forEach(listener => listener(data));
  }

  // --- Convenience Methods ---

  async fetchAgents() {
    return this.request('agents.list');
  }

  async fetchModels() {
    return this.request('models.list');
  }

  async fetchSystemStatus() {
    return this.request('system.status'); // Guessing based on common patterns, may need adjustment
  }
}

// Export a singleton instance
export const openClawApi = new OpenClawService();
