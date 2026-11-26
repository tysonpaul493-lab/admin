import { getApiBase } from './client';

/**
 * Live WebSocket Connection Service for LifeRoute Admin Command Center
 * Intercepts real-time events between User App and Driver Paramedic App
 */

export interface LiveTelemetryEvent {
  id: string;
  timestamp: string;
  type: 'LOCATION' | 'NEW_BOOKING' | 'ACCEPTED' | 'STATUS_ADVANCE' | 'COMPLETED' | 'CANCELLED' | 'CHAT' | 'ALERT';
  title: string;
  description: string;
  driver_name?: string;
  driver_phone?: string;
  patient_name?: string;
  patient_phone?: string;
  booking_reference?: string;
  latitude?: number;
  longitude?: number;
  speed_kmh?: number;
  heading?: number;
  distance_km?: number;
  eta_minutes?: number;
  status?: string;
  raw?: any;
}

type EventListener<T> = (data: T) => void;

class LiveSocketService {
  private socket: WebSocket | null = null;
  private isConnected = false;
  private reconnectTimer: any = null;
  private pingTimer: any = null;
  private socketId: string | null = null;
  private recentEvents: LiveTelemetryEvent[] = [];
  
  private listeners: {
    statusChange: EventListener<boolean>[];
    event: EventListener<LiveTelemetryEvent>[];
    location: EventListener<{ driverId: number; lat: number; lng: number; heading: number; speed: number; distanceKm?: number; etaMinutes?: number; bookingRef?: string }>[];
    bookingUpdate: EventListener<{ bookingId: number; reference: string; status: string; driverName?: string; patientName?: string }>[];
  } = {
    statusChange: [],
    event: [],
    location: [],
    bookingUpdate: []
  };

  constructor() {
    this.connect();
  }

  private getWsUrl(): string {
    if ((import.meta as any).env?.VITE_WS_URL) {
      return (import.meta as any).env.VITE_WS_URL;
    }
    if (typeof window !== 'undefined') {
      if (window.location.protocol === 'https:') {
        return `wss://${window.location.host}/app/liferoute_reverb_key`;
      }
      const h = window.location.hostname;
      const wsHost = h && h !== 'localhost' && h !== '127.0.0.1' ? h : '127.0.0.1';
      return `ws://${wsHost}:8080/app/liferoute_reverb_key`;
    }
    return 'ws://127.0.0.1:8080/app/liferoute_reverb_key';
  }

  public reconnect(): void {
    try {
      this.socket?.close();
    } catch (_) {}
    this.socket = null;
    this.socketId = null;
    this.isConnected = false;
    this.connect();
  }

  public connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const wsUrl = this.getWsUrl();
      console.log(`🔌 [Admin LiveSocket] Connecting to ${wsUrl}...`);

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log(`✅ [Admin LiveSocket] Connected to backend dispatch server (${wsUrl})`);
        this.isConnected = true;
        this.notifyStatus(true);

        // Subscribe to public dispatch broadcast channel immediately
        this.sendPusher('pusher:subscribe', { channel: 'emergency-broadcasts' });

        // Keep-alive heartbeat
        if (this.pingTimer) clearInterval(this.pingTimer);
        this.pingTimer = setInterval(() => {
          if (this.isConnected && this.socket?.readyState === WebSocket.OPEN) {
            this.sendPusher('pusher:ping', {});
          }
        }, 15000);
      };

      this.socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          this.handleIncoming(parsed);
        } catch (e) {
          console.warn('Error parsing incoming WS message:', e);
        }
      };

      this.socket.onclose = () => {
        console.warn('❌ [Admin LiveSocket] Disconnected from server. Reconnecting in 3s...');
        this.isConnected = false;
        this.notifyStatus(false);
        this.scheduleReconnect();
      };

      this.socket.onerror = (err) => {
        console.warn('⚠️ [Admin LiveSocket] Socket error:', err);
      };

    } catch (e) {
      console.warn('Could not establish WebSocket connection:', e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 3000);
  }

  private sendPusher(event: string, data: any): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ event, data }));
    }
  }

  private async subscribePrivateChannels(socketId: string): Promise<void> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ambulance_admin_token') : null;
    if (!token || !socketId) return;

    const privateChannels = ['private-bookings', 'private-booking', 'private-driver'];
    const authUrl = `${getApiBase()}/broadcasting/auth`;
    for (const ch of privateChannels) {
      try {
        const res = await fetch(authUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ channel_name: ch, socket_id: socketId }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.auth) {
            this.sendPusher('pusher:subscribe', {
              channel: ch,
              auth: json.auth,
              ...(json.channel_data ? { channel_data: json.channel_data } : {}),
            });
          }
        }
      } catch (_) {}
    }
  }

  private handleIncoming(msg: any): void {
    const eventName = msg.event || '';
    let payload = msg.data;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (_) {}
    }
    if (!payload && typeof msg === 'object') {
      payload = msg;
    }

    if (eventName === 'pusher:connection_established' && payload?.socket_id) {
      this.socketId = String(payload.socket_id);
      this.subscribePrivateChannels(this.socketId);
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // 1. Live Driver GPS Location Telemetry
    if (eventName === 'DriverLocationUpdated' || eventName.includes('Location')) {
      const lat = Number(payload.latitude ?? payload.current_lat ?? payload.lat);
      const lng = Number(payload.longitude ?? payload.current_lng ?? payload.lng);
      const heading = Number(payload.heading ?? 0);
      const speed = Number(payload.speed ?? 0);
      const driver = payload.driver || {};
      const driverName = driver.name || driver.full_name || 'Ambulance Paramedic';
      const bookingRef = payload.booking_reference || payload.reference || '';
      const distKm = payload.distance_km != null ? Number(payload.distance_km) : undefined;
      const etaMin = payload.eta_minutes != null ? Number(payload.eta_minutes) : undefined;

      if (!isNaN(lat) && !isNaN(lng)) {
        const liveEv: LiveTelemetryEvent = {
          id: `loc-${Date.now()}-${Math.floor(performance.now() * 1000)}`,
          timestamp: timeStr,
          type: 'LOCATION',
          title: `Ambulance Telemetry: ${driverName}`,
          description: `Speed: ${speed.toFixed(0)} km/h | Heading: ${heading.toFixed(0)}° | Position: ${lat.toFixed(4)}, ${lng.toFixed(4)} ${distKm ? `(${distKm.toFixed(1)} km to target, ETA: ${etaMin} min)` : ''}`,
          driver_name: driverName,
          booking_reference: bookingRef,
          latitude: lat,
          longitude: lng,
          speed_kmh: speed,
          heading: heading,
          distance_km: distKm,
          eta_minutes: etaMin,
          raw: payload,
        };

        this.addEvent(liveEv);

        this.listeners.location.forEach(cb => cb({
          driverId: Number(driver.id || payload.driver_id || 1),
          lat,
          lng,
          heading,
          speed,
          distanceKm: distKm,
          etaMinutes: etaMin,
          bookingRef,
        }));
      }
    }

    // 2. New Emergency Booking Placed by User
    else if (
      eventName === 'BookingCreated' ||
      eventName === 'NewEmergencyBooking' ||
      eventName === 'BookingRequested' ||
      eventName === 'NewEmergencyIncident' ||
      eventName === 'new-booking-request' ||
      eventName.includes('Created')
    ) {
      const patientName = payload.patient_name || payload.name || 'Emergency Patient';
      const patientPhone = payload.callback_phone || payload.patient_phone || payload.phone || '';
      const ref = payload.booking_reference || `#BK-${payload.id || payload.booking_id || ''}`;
      const pickup = payload.pickup_address || 'Patient Current GPS Location';

      const liveEv: LiveTelemetryEvent = {
        id: `book-${Date.now()}`,
        timestamp: timeStr,
        type: 'NEW_BOOKING',
        title: `🚨 New Emergency Call: ${ref}`,
        description: `Patient ${patientName} (${patientPhone}) requested ambulance at ${pickup}`,
        patient_name: patientName,
        patient_phone: patientPhone,
        booking_reference: ref,
        status: 'REQUESTED',
        raw: payload,
      };

      this.addEvent(liveEv);
      this.playAlertTone();

      this.listeners.bookingUpdate.forEach(cb => cb({
        bookingId: Number(payload.id || payload.booking_id || 0),
        reference: ref,
        status: 'REQUESTED',
        patientName,
      }));
    }

    // 3. Booking Accepted / Driver Assigned
    else if (eventName === 'DriverAssigned' || eventName === 'BookingAccepted' || eventName.includes('Accepted')) {
      const driver = payload.driver || {};
      const driverName = driver.name || 'Paramedic Unit';
      const ref = payload.booking_reference || `#BK-${payload.booking_id || payload.id || ''}`;

      const liveEv: LiveTelemetryEvent = {
        id: `accept-${Date.now()}`,
        timestamp: timeStr,
        type: 'ACCEPTED',
        title: `🚑 Dispatch Accepted: ${ref}`,
        description: `Paramedic ${driverName} responded and accepted emergency dispatch.`,
        driver_name: driverName,
        booking_reference: ref,
        status: 'DISPATCHED',
        raw: payload,
      };

      this.addEvent(liveEv);
      this.playChimeTone();

      this.listeners.bookingUpdate.forEach(cb => cb({
        bookingId: Number(payload.booking_id || payload.id || 0),
        reference: ref,
        status: 'DISPATCHED',
        driverName,
      }));
    }

    // 4. Trip Status Advanced (Arrived pickup / Patient onboard / Arrived hospital / Completed / Cancelled)
    else if (
      eventName === 'TripStatusUpdated' ||
      eventName === 'BookingUpdated' ||
      eventName === 'TripCompleted' ||
      eventName === 'BookingCancelled' ||
      eventName === 'TripCancelled' ||
      eventName === 'DriverStatusUpdated'
    ) {
      const status =
        eventName === 'TripCompleted'
          ? 'trip_completed'
          : (eventName === 'BookingCancelled' || eventName === 'TripCancelled')
          ? 'cancelled'
          : eventName === 'DriverStatusUpdated'
          ? (payload.is_online ? 'DRIVER_ONLINE' : 'DRIVER_OFFLINE')
          : (payload.status || (payload.booking && payload.booking.status) || '');
      const ref = payload.booking_reference || (payload.booking && payload.booking.booking_reference) || '';

      const readableStatus: { [k: string]: string } = {
        'driver_arrived': 'Arrived at Patient Pickup',
        'arrived_at_pickup': 'Arrived at Patient Pickup',
        'patient_picked_up': 'Patient Onboard - En Route to Hospital',
        'patient_onboard': 'Patient Onboard - En Route to Hospital',
        'traveling_to_hospital': 'In Transit to Receiving Hospital',
        'arrived_at_hospital': 'Arrived at Hospital Emergency Bay',
        'trip_completed': 'Handover Complete - Emergency Run Finished',
        'completed': 'Handover Complete - Emergency Run Finished',
        'cancelled': 'Emergency Run Cancelled',
      };

      const liveEv: LiveTelemetryEvent = {
        id: `status-${Date.now()}`,
        timestamp: timeStr,
        type: status.includes('completed') ? 'COMPLETED' : (status.includes('cancelled') ? 'CANCELLED' : 'STATUS_ADVANCE'),
        title: `Trip Status Update: ${ref}`,
        description: readableStatus[status] || `Trip status updated to: ${status}`,
        booking_reference: ref,
        status: status.toUpperCase(),
        raw: payload,
      };

      this.addEvent(liveEv);

      this.listeners.bookingUpdate.forEach(cb => cb({
        bookingId: Number(payload.booking_id || payload.id || 0),
        reference: ref,
        status: status.toUpperCase(),
      }));
    }

    // 5. Patient <-> Driver Chat Message Relay
    else if (eventName === 'TripChatMessage') {
      const sender = payload.sender_name || payload.sender || 'Citizen / Paramedic';
      const text = payload.message || payload.text || '';
      const ref = payload.booking_reference || '';

      const liveEv: LiveTelemetryEvent = {
        id: `chat-${Date.now()}`,
        timestamp: timeStr,
        type: 'CHAT',
        title: `💬 Live Emergency Chat (${ref})`,
        description: `${sender}: "${text}"`,
        booking_reference: ref,
        raw: payload,
      };

      this.addEvent(liveEv);
    }
  }

  private addEvent(ev: LiveTelemetryEvent): void {
    this.recentEvents.unshift(ev);
    if (this.recentEvents.length > 50) {
      this.recentEvents.pop();
    }
    this.listeners.event.forEach(cb => cb(ev));
  }

  private playAlertTone(): void {
    if (this.isMuted) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (_) {}
  }

  private playChimeTone(): void {
    if (this.isMuted) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (_) {}
  }

  private notifyStatus(connected: boolean): void {
    this.listeners.statusChange.forEach(cb => cb(connected));
  }

  // Public Subscriptions
  public onStatusChange(callback: EventListener<boolean>): () => void {
    this.listeners.statusChange.push(callback);
    callback(this.isConnected);
    return () => {
      this.listeners.statusChange = this.listeners.statusChange.filter(cb => cb !== callback);
    };
  }

  public onLiveEvent(callback: EventListener<LiveTelemetryEvent>): () => void {
    this.listeners.event.push(callback);
    return () => {
      this.listeners.event = this.listeners.event.filter(cb => cb !== callback);
    };
  }

  public onLocationUpdate(callback: EventListener<{ driverId: number; lat: number; lng: number; heading: number; speed: number; distanceKm?: number; etaMinutes?: number; bookingRef?: string }>): () => void {
    this.listeners.location.push(callback);
    return () => {
      this.listeners.location = this.listeners.location.filter(cb => cb !== callback);
    };
  }

  public onBookingUpdate(callback: EventListener<{ bookingId: number; reference: string; status: string; driverName?: string; patientName?: string }>): () => void {
    this.listeners.bookingUpdate.push(callback);
    return () => {
      this.listeners.bookingUpdate = this.listeners.bookingUpdate.filter(cb => cb !== callback);
    };
  }

  private isMuted: boolean = false;

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public onEvent(callback: EventListener<LiveTelemetryEvent>): () => void {
    return this.onLiveEvent(callback);
  }

  public getRecentEvents(): LiveTelemetryEvent[] {
    return [...this.recentEvents];
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }
}

export const liveSocket = new LiveSocketService();
