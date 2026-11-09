import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  ShieldCheck,
  Lock,
  Clock,
  Radio,
  Volume2,
  CheckCircle,
  AlertCircle,
  X,
  Server,
  Zap,
} from 'lucide-react';
import { platformStore } from '../../services/store';

export const VirtualCallModal: React.FC = () => {
  const [storeState, setStoreState] = useState(platformStore.getState());
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isCalling, setIsCalling] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const unsub = platformStore.subscribe(() => {
      setStoreState({ ...platformStore.getState() });
    });
    return unsub;
  }, []);

  const activeCall = storeState.activeVirtualCall;

  // Handle call timer when connected
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isConnected) {
      timer = setInterval(() => {
        setCallDuration((prev) => {
          const next = prev + 1;
          if (activeCall) {
            activeCall.durationSeconds = next;
          }
          return next;
        });
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(timer);
  }, [isConnected, activeCall]);

  if (!activeCall || !activeCall.isOpen) return null;

  const handleSimulateConnect = () => {
    setIsCalling(true);
    setTimeout(() => {
      setIsCalling(false);
      setIsConnected(true);
      platformStore.connectVirtualCall();
    }, 1800);
  };

  const handleEndCall = () => {
    setIsConnected(false);
    setIsCalling(false);
    platformStore.endVirtualCall();
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden text-center">
        {/* Close / Minimize */}
        <button
          onClick={handleEndCall}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Security / Privacy Banner */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-[11px] font-bold mb-4">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Exotel Masked Cloud Telephony</span>
        </div>

        {/* Caller Avatar / Waves */}
        <div className="relative my-4 flex items-center justify-center">
          {isConnected && (
            <div className="absolute w-24 h-24 rounded-full bg-emerald-500/20 animate-ping" />
          )}
          {isCalling && (
            <div className="absolute w-24 h-24 rounded-full bg-sky-500/20 animate-ping" />
          )}
          <div
            className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl transition-all relative z-10 ${
              isConnected
                ? 'bg-emerald-500 text-slate-950'
                : isCalling
                ? 'bg-sky-500 text-white animate-pulse'
                : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}
          >
            <PhoneCall className="w-9 h-9" />
          </div>
        </div>

        {/* Contact Info */}
        <h3 className="text-lg font-black text-white">
          {activeCall.targetName}
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          {activeCall.callerRole === 'rider' ? 'Assigned Ride Captain' : 'Customer Passenger'}
        </p>

        {/* Telephony Bridge Credentials */}
        <div className="my-5 p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-left">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Virtual Bridge Number:</span>
            <span className="font-mono font-bold text-amber-400">
              {activeCall.virtualNumber}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Extension Bridge PIN:</span>
            <span className="font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/30">
              {activeCall.extensionPin}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
            <span className="text-slate-500 text-[10px]">TRAI Privacy Masking:</span>
            <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              <span>100% Protected</span>
            </span>
          </div>
        </div>

        {/* Call Status & Timer */}
        <div className="mb-6">
          {isConnected ? (
            <div className="space-y-1">
              <div className="text-2xl font-black font-mono text-emerald-400">
                {formatTime(callDuration)}
              </div>
              <div className="text-xs text-emerald-400/80 flex items-center justify-center gap-1">
                <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                <span>Call Connected (Secure SIP)</span>
              </div>
            </div>
          ) : isCalling ? (
            <div className="text-xs text-sky-400 flex items-center justify-center gap-1.5 animate-pulse">
              <Radio className="w-3.5 h-3.5 animate-spin" />
              <span>Dialing cloud bridge...</span>
            </div>
          ) : (
            <div className="text-xs text-slate-400">
              Press Call to connect securely without revealing your personal phone number.
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex gap-3">
          {!isConnected && !isCalling && (
            <button
              onClick={handleSimulateConnect}
              className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-2xl text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4" />
              <span>Connect Masked Call</span>
            </button>
          )}

          {(isConnected || isCalling) && (
            <button
              onClick={handleEndCall}
              className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-2xl text-xs transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2"
            >
              <PhoneOff className="w-4 h-4" />
              <span>End Call</span>
            </button>
          )}

          <button
            onClick={handleEndCall}
            className="px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs"
          >
            Cancel
          </button>
        </div>

        {/* TRAI Privacy Disclaimer */}
        <p className="text-[10px] text-slate-500 mt-4 leading-tight">
          TRAI Telecommunications Mandate: Personal phone numbers are masked through licensed cloud telephony to safeguard customer safety and prevent spam.
        </p>
      </div>
    </div>
  );
};
