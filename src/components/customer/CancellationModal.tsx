import React, { useState } from 'react';
import { AlertTriangle, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Booking, STANDARD_CANCELLATION_REASONS, StandardCancellationReason } from '../../types';

interface CancellationModalProps {
  isOpen: boolean;
  booking: Booking | null;
  cancellationFee: number;
  onClose: () => void;
  onConfirmCancel: (reason: string, additionalExplanation?: string) => void;
}

export const CancellationModal: React.FC<CancellationModalProps> = ({
  isOpen,
  booking,
  cancellationFee,
  onClose,
  onConfirmCancel,
}) => {
  const [selectedReason, setSelectedReason] = useState<StandardCancellationReason>(
    STANDARD_CANCELLATION_REASONS[0]
  );
  const [otherReasonText, setOtherReasonText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  // Determine if a cancellation fee applies
  // Free during searching; if captain has accepted and arrived or > 3 min, apply configured fee
  const isFeeApplicable =
    booking.status === 'arrived' ||
    (booking.status === 'accepted' && booking.acceptedAt && Date.now() - booking.acceptedAt > 180000);
  const applicableFee = isFeeApplicable ? cancellationFee : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedReason === 'Other reason' && !otherReasonText.trim()) {
      setError('Please provide a brief explanation for cancelling.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      onConfirmCancel(selectedReason, otherReasonText.trim() || undefined);
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel booking. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight uppercase">
                CANCEL YOUR RIDE?
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Booking ID: {booking.bookingRef}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message */}
        <div className="py-3">
          <p className="text-xs font-semibold text-slate-700">
            Please tell us why you want to cancel this ride.
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Your feedback helps us maintain driver accountability and service quality.
          </p>
        </div>

        {/* Cancellation Fee Policy Notice */}
        {applicableFee > 0 ? (
          <div className="mb-3.5 p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Cancellation Fee: ₹{applicableFee} </span>
              <span className="text-[11px] text-amber-800">
                (The captain has already arrived or been en-route for over 3 minutes).
              </span>
            </div>
          </div>
        ) : (
          <div className="mb-3.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold text-[11px]">
              100% Free Cancellation: No charges apply at this stage.
            </span>
          </div>
        )}

        {/* Reason Selection Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {STANDARD_CANCELLATION_REASONS.map((reason) => {
              const isSelected = selectedReason === reason;
              return (
                <label
                  key={reason}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-50 border-slate-900 shadow-sm'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancellationReason"
                    value={reason}
                    checked={isSelected}
                    onChange={() => {
                      setSelectedReason(reason);
                      setError(null);
                    }}
                    className="w-4 h-4 text-slate-900 focus:ring-slate-900 border-slate-300"
                  />
                  <span className="text-xs font-semibold text-slate-800">{reason}</span>
                </label>
              );
            })}
          </div>

          {/* Conditional text field if "Other reason" is selected */}
          {selectedReason === 'Other reason' && (
            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-bold text-slate-700 block">
                Additional Details <span className="text-red-500">*</span>
              </label>
              <textarea
                value={otherReasonText}
                onChange={(e) => setOtherReasonText(e.target.value)}
                placeholder="Please describe why you are cancelling..."
                className="w-full p-2.5 text-xs text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900 resize-none h-16"
                required
              />
            </div>
          )}

          {error && <div className="text-xs font-semibold text-red-600">{error}</div>}

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all"
            >
              Keep My Ride
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl shadow-md shadow-red-600/20 transition-all active:scale-[0.99]"
            >
              {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
