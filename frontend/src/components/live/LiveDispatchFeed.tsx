import React, { useEffect, useState } from 'react';
import { 
  Volume2, VolumeX, CheckCircle, Clock, ChevronDown, ChevronUp, Activity, Radio
} from 'lucide-react';
import { liveSocket, LiveTelemetryEvent } from '../../api/liveSocket';

export const LiveDispatchFeed: React.FC = () => {
  const [events, setEvents] = useState<LiveTelemetryEvent[]>([]);
  const [isConnected, setIsConnected] = useState(liveSocket.getConnectionStatus());
  const [isMuted, setIsMuted] = useState(liveSocket.getMuted());
  const [isExpanded, setIsExpanded] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'LOCATION' | 'BOOKINGS' | 'STATUS'>('ALL');

  useEffect(() => {
    // Initial events queue
    setEvents(liveSocket.getRecentEvents());

    // Subscribe to connection status
    const unsubStatus = liveSocket.onStatusChange((status) => {
      setIsConnected(status);
    });

    // Subscribe to new incoming telemetry events
    const unsubEvents = liveSocket.onEvent((event) => {
      setEvents((prev) => [event, ...prev.slice(0, 49)]);
    });

    return () => {
      unsubStatus();
      unsubEvents();
    };
  }, []);

  const toggleMute = () => {
    const next = !isMuted;
    liveSocket.setMuted(next);
    setIsMuted(next);
  };

  const filteredEvents = events.filter((ev) => {
    if (filter === 'LOCATION') return ev.type === 'LOCATION';
    if (filter === 'BOOKINGS') return ev.type === 'NEW_BOOKING' || ev.type === 'ACCEPTED';
    if (filter === 'STATUS') return ev.type === 'STATUS_ADVANCE' || ev.type === 'COMPLETED' || ev.type === 'CANCELLED';
    return true;
  });

  const getEventBadge = (type: LiveTelemetryEvent['type']) => {
    switch (type) {
      case 'NEW_BOOKING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
            EMERGENCY CALL
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
            CREW ASSIGNED
          </span>
        );
      case 'LOCATION':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            GPS TELEMETRY
          </span>
        );
      case 'STATUS_ADVANCE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            PHASE ADVANCE
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> HANDOVER COMPLETE
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            TRIP CANCELLED
          </span>
        );
      case 'CHAT':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            DISPATCH CHAT
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            TELEMETRY
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs mb-6 w-full">
      {/* Header Bar */}
      <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <span className={`w-3.5 h-3.5 rounded-full block ${isConnected ? 'bg-teal-500 animate-ping' : 'bg-red-500'}`} />
            <span className={`w-3.5 h-3.5 rounded-full absolute top-0 left-0 ${isConnected ? 'bg-teal-600' : 'bg-red-500'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-600" />
                Live Dispatch & Telemetry Stream
              </span>
              <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full uppercase font-bold tracking-wider ${
                isConnected 
                  ? 'bg-teal-50 text-teal-700 border border-teal-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {isConnected ? 'Real-Time Protocol: Active' : 'Connecting...'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Instantaneous telemetry synchronization between Citizen User App and Paramedic Driver App
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Mute Audio Button */}
          <button
            onClick={toggleMute}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              isMuted 
                ? 'bg-slate-100 text-slate-500 border-slate-200 hover:text-slate-800' 
                : 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
            }`}
            title={isMuted ? 'Unmute siren & chime alerts' : 'Mute audio alerts'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{isMuted ? 'Muted' : 'Sound On'}</span>
          </button>

          {/* Toggle Expand / Collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition"
            title="Toggle Feed View"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Filter Bar */}
          <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-slate-500 uppercase font-semibold">Filter:</span>
              <button
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition ${
                  filter === 'ALL' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                }`}
              >
                All Events ({events.length})
              </button>
              <button
                onClick={() => setFilter('BOOKINGS')}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition ${
                  filter === 'BOOKINGS' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                }`}
              >
                🚨 Emergency Calls
              </button>
              <button
                onClick={() => setFilter('LOCATION')}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition ${
                  filter === 'LOCATION' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                }`}
              >
                📍 GPS Telemetry
              </button>
              <button
                onClick={() => setFilter('STATUS')}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition ${
                  filter === 'STATUS' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                }`}
              >
                🔄 Trip Progress
              </button>
            </div>

            <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-600" />
              Live channel: 8080 / WS
            </span>
          </div>

          {/* Events Stream Body */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 font-sans">
            {filteredEvents.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                <Radio className="w-7 h-7 mx-auto mb-2 text-teal-600 animate-pulse" />
                <span className="font-medium text-slate-500">Listening for live telemetry between Citizen User and Paramedic Driver apps...</span>
              </div>
            ) : (
              filteredEvents.map((ev) => (
                <div 
                  key={ev.id} 
                  className={`px-5 py-3.5 flex items-start justify-between gap-4 transition hover:bg-slate-50 ${
                    ev.type === 'NEW_BOOKING' ? 'bg-red-50/50' : ''
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      {getEventBadge(ev.type)}
                      <span className="font-bold text-xs text-slate-900">
                        {ev.title}
                      </span>
                      {ev.booking_reference && (
                        <span className="text-[10px] font-mono font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {ev.booking_reference}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      {ev.description}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {ev.timestamp}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};