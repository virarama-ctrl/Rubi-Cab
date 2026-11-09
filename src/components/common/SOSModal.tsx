import React, { useState } from 'react';
import { AlertTriangle, PhoneCall, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import { Booking, Language } from '../../types';
import { getTranslation } from '../../utils/translations';
import { platformStore } from '../../services/store';

interface SOSModalProps {
  booking?: Booking | null;
  lang: Language;
  onClose: () => void;
}

export const SOSModal: React.FC<SOSModalProps> = ({ booking, lang, onClose }) => {
  const [isTriggered, setIsTriggered] = useState<boolean>(false);

  const handleTriggerSOS = () => {
    platformStore.triggerEmergencySOS(booking?.id);
    setIsTriggered(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-red-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-red-600 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 transition-all"
          aria-label="Close SOS Modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center mx-auto mb-4 ring-8 ring-red-600/10 animate-pulse">
            <ShieldAlert className="w-10 h-10" />
          </div>

          <h3 className="text-xl font-black text-white uppercase tracking-wide">
            {getTranslation(lang, 'emergencySos')}
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            Use in genuine emergencies only. This alerts emergency response teams & shares live GPS coordinates.
          </p>

          {isTriggered ? (
            <div className="my-6 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 text-left">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1">
                <CheckCircle2 className="w-5 h-5" />
                <span>Emergency Services Dispatched</span>
              </div>
              <p className="text-xs text-slate-300">
                112 Police Control Room has received your live telemetry location. Your emergency contacts have received SMS with tracking link.
              </p>
              <div className="mt-3 p-2 bg-slate-800 rounded-xl text-[11px] font-mono text-slate-400">
                Location: {booking?.pickup.lat.toFixed(4) || '13.0418'}° N, {booking?.pickup.lng.toFixed(4) || '80.2341'}° E
              </div>
            </div>
          ) : (
            <div className="my-6 space-y-3">
              <button
                onClick={handleTriggerSOS}
                className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 active:scale-95 text-white font-black rounded-2xl shadow-xl shadow-red-600/40 flex items-center justify-center gap-3 transition-all"
              >
                <AlertTriangle className="w-6 h-6 animate-bounce" />
                <span className="text-base tracking-wider uppercase">Activate Emergency SOS</span>
              </button>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <a
                  href="tel:112"
                  className="py-3 px-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-200 flex items-center justify-center gap-2 border border-slate-700"
                >
                  <PhoneCall className="w-4 h-4 text-emerald-400" />
                  <span>Call 112 Police</span>
                </a>
                <a
                  href="tel:1091"
                  className="py-3 px-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-200 flex items-center justify-center gap-2 border border-slate-700"
                >
                  <PhoneCall className="w-4 h-4 text-pink-400" />
                  <span>1091 Women Help</span>
                </a>
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200 underline"
          >
            I am safe / Dismiss SOS
          </button>
        </div>
      </div>
    </div>
  );
};
