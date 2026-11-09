import React, { useState } from 'react';
import {
  X,
  CreditCard,
  QrCode,
  Smartphone,
  Building,
  Banknote,
  CheckCircle2,
  ShieldCheck,
  Lock,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Booking, Language, PaymentMode } from '../../types';
import { getTranslation } from '../../utils/translations';

interface PaymentModalProps {
  booking: Booking;
  lang: Language;
  onClose: () => void;
  onPaymentSuccess: (mode: PaymentMode, txnId: string) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  booking,
  lang,
  onClose,
  onPaymentSuccess,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMode>('upi');
  const [selectedUpiApp, setSelectedUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'qr'>('gpay');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [cardDetails, setCardDetails] = useState({
    number: '4532 •••• •••• 9012',
    name: booking.customerName || 'Ramesh Sundaram',
    expiry: '08/29',
    cvv: '821',
  });

  const grossFare = booking.finalFare || booking.estimatedFare;
  const fareBreakdown = booking.fareBreakdown;

  const handlePayNow = () => {
    setIsProcessing(true);
    // Simulate secure 3D Secure / UPI server webhook handshake
    setTimeout(() => {
      setIsProcessing(false);
      setIsCompleted(true);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      const txnId = `PAY_IND_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      setTimeout(() => {
        onPaymentSuccess(selectedMethod, txnId);
      }, 1400);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-100">
        {/* Close Button */}
        {!isProcessing && !isCompleted && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-800 transition-all"
            aria-label="Close Payment Modal"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {isCompleted ? (
          <div className="py-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 ring-8 ring-emerald-500/10 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white mb-1">
              {getTranslation(lang, 'paymentSuccess')}
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              ₹{grossFare} paid via {selectedMethod.toUpperCase()}
            </p>
            <div className="px-4 py-2 bg-slate-800/80 rounded-xl text-xs font-mono text-slate-300">
              Txn: TXN-{Date.now().toString().slice(-8)}
            </div>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {getTranslation(lang, 'selectPaymentMode')}
                </h3>
                <p className="text-xs text-slate-400">100% RBI & PCI-DSS Compliant Gateway</p>
              </div>
            </div>

            {/* Total Amount Pill */}
            <div className="my-5 p-4 rounded-2xl bg-gradient-to-r from-sky-950/60 via-slate-850 to-slate-900 border border-sky-800/40 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  {getTranslation(lang, 'paymentRequired')}
                </span>
                <div className="text-2xl font-black text-white mt-0.5">
                  ₹{grossFare}
                </div>
              </div>
              <div className="text-right text-xs text-slate-400">
                <div>Trip: <span className="text-slate-200 font-mono">{booking.bookingRef}</span></div>
                {fareBreakdown?.discount ? (
                  <div className="text-emerald-400 font-semibold">₹{fareBreakdown.discount} Saved</div>
                ) : null}
              </div>
            </div>

            {/* Payment Method Selector Tabs */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <button
                type="button"
                onClick={() => setSelectedMethod('upi')}
                className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border text-xs font-semibold transition-all ${
                  selectedMethod === 'upi'
                    ? 'bg-sky-600/20 border-sky-500 text-sky-300'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-4 h-4 mb-1" />
                <span>UPI</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMethod('card')}
                className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border text-xs font-semibold transition-all ${
                  selectedMethod === 'card'
                    ? 'bg-sky-600/20 border-sky-500 text-sky-300'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-4 h-4 mb-1" />
                <span>Card</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMethod('netbanking')}
                className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border text-xs font-semibold transition-all ${
                  selectedMethod === 'netbanking'
                    ? 'bg-sky-600/20 border-sky-500 text-sky-300'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building className="w-4 h-4 mb-1" />
                <span>NetBank</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMethod('cash')}
                className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border text-xs font-semibold transition-all ${
                  selectedMethod === 'cash'
                    ? 'bg-sky-600/20 border-sky-500 text-sky-300'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Banknote className="w-4 h-4 mb-1" />
                <span>Cash</span>
              </button>
            </div>

            {/* Tab Specific Content */}
            {selectedMethod === 'upi' && (
              <div className="space-y-3 mb-5">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUpiApp('gpay')}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-medium text-left transition-all ${
                      selectedUpiApp === 'gpay'
                        ? 'border-emerald-500 bg-emerald-950/20 text-white'
                        : 'border-slate-800 bg-slate-800/30 text-slate-300'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-white text-slate-900 flex items-center justify-center font-bold text-[10px]">
                      G
                    </div>
                    <span>Google Pay UPI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedUpiApp('phonepe')}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-medium text-left transition-all ${
                      selectedUpiApp === 'phonepe'
                        ? 'border-purple-500 bg-purple-950/20 text-white'
                        : 'border-slate-800 bg-slate-800/30 text-slate-300'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[10px]">
                      Pe
                    </div>
                    <span>PhonePe UPI</span>
                  </button>
                </div>

                {/* QR Code Quick Scan Option */}
                <div className="p-3 bg-slate-850 rounded-2xl border border-slate-800 flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl text-slate-950">
                    <QrCode className="w-12 h-12" />
                  </div>
                  <div className="text-xs">
                    <div className="font-semibold text-slate-200">Scan & Pay Any UPI App</div>
                    <div className="text-slate-400 text-[11px] mt-0.5">Paytm, BHIM, Cred, Amazon Pay</div>
                    <div className="text-sky-400 font-mono text-[10px] mt-1">UPI ID: nammaride.pay@icici</div>
                  </div>
                </div>
              </div>
            )}

            {selectedMethod === 'card' && (
              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Card Number</label>
                  <input
                    type="text"
                    value={cardDetails.number}
                    onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Expiry Date</label>
                    <input
                      type="text"
                      value={cardDetails.expiry}
                      onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">CVV</label>
                    <input
                      type="password"
                      maxLength={3}
                      value={cardDetails.cvv}
                      onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedMethod === 'netbanking' && (
              <div className="grid grid-cols-2 gap-2 mb-5">
                {['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Canara Bank', 'Kotak Mahindra'].map((bank) => (
                  <button
                    key={bank}
                    type="button"
                    className="p-2.5 rounded-xl border border-slate-800 bg-slate-800/40 text-xs text-slate-300 hover:border-sky-500 hover:text-white transition-all text-left"
                  >
                    {bank}
                  </button>
                ))}
              </div>
            )}

            {selectedMethod === 'cash' && (
              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/30 text-xs text-amber-200/90 mb-5">
                <p className="font-semibold mb-1">Pay Cash directly to Captain</p>
                <p className="text-[11px] text-amber-300/70">
                  Please keep exact change of ₹{grossFare} ready. The captain will confirm cash receipt upon settlement.
                </p>
              </div>
            )}

            {/* Pay Button */}
            <button
              onClick={handlePayNow}
              disabled={isProcessing}
              className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 active:scale-[0.99] rounded-2xl font-bold text-white shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing Secure Payment...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Pay ₹{grossFare} Securely</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>

            <div className="mt-3 text-center text-[10px] text-slate-500 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" />
              <span>256-Bit Encrypted Indian Payment Gateway</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
