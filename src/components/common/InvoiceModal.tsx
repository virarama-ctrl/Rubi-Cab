import React from 'react';
import { X, Printer, Download, CheckCircle, FileText } from 'lucide-react';
import { Booking, Language } from '../../types';
import { getTranslation } from '../../utils/translations';

interface InvoiceModalProps {
  booking: Booking;
  lang: Language;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ booking, lang, onClose }) => {
  const breakdown = booking.fareBreakdown;
  const grossFare = booking.finalFare || booking.estimatedFare;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative text-slate-100 print:text-black print:bg-white print:border-none print:shadow-none">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-800 transition-all print:hidden"
          aria-label="Close Invoice Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Invoice Header */}
        <div className="border-b border-slate-800 pb-5 mb-5 print:border-slate-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl print:bg-transparent print:text-blue-600">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-white print:text-black">
                  {getTranslation(lang, 'brandName')} TAX INVOICE
                </h2>
                <p className="text-xs text-slate-400 print:text-slate-600">
                  Govt. of India Transport Aggregator Electronic Receipt
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 print:border-emerald-600 print:text-emerald-700">
                <CheckCircle className="w-3 h-3" /> PAID
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-xs font-mono text-slate-400 print:text-slate-700">
            <div>
              <div>Invoice No: <span className="text-slate-200 print:text-black font-semibold">INV-{booking.bookingRef.replace('NR-', '')}</span></div>
              <div>Date: <span className="text-slate-200 print:text-black">{new Date(booking.completedAt || booking.createdAt).toLocaleDateString()}</span></div>
              <div>GSTIN: <span className="text-slate-200 print:text-black">33AAACN1234F1Z8</span></div>
            </div>
            <div className="text-right">
              <div>Booking Ref: <span className="text-slate-200 print:text-black font-bold">{booking.bookingRef}</span></div>
              <div>Payment Mode: <span className="text-slate-200 print:text-black uppercase">{booking.paymentMethod || 'UPI'}</span></div>
              <div>Txn Ref: <span className="text-slate-200 print:text-black">{booking.paymentTxnId?.slice(0, 16) || 'TXN-SETTLED'}</span></div>
            </div>
          </div>
        </div>

        {/* Journey Details */}
        <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800/80 mb-5 text-xs print:bg-slate-50 print:border-slate-200">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Customer</div>
              <div className="font-semibold text-slate-200 print:text-black">{booking.customerName}</div>
              <div className="text-slate-400 text-[11px]">{booking.customerPhone}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Captain & Vehicle</div>
              <div className="font-semibold text-slate-200 print:text-black">{booking.captain?.name || 'Verified Captain'}</div>
              <div className="text-slate-400 text-[11px]">
                {booking.captain?.vehicleModel} ({booking.captain?.vehicleRegNumber || 'TN 09 BZ 4821'})
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-800 print:border-slate-200">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1" />
              <div>
                <span className="text-slate-400 text-[10px] uppercase">Pickup: </span>
                <span className="text-slate-200 print:text-black font-medium">{booking.pickup.name}</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400 mt-1" />
              <div>
                <span className="text-slate-400 text-[10px] uppercase">Drop: </span>
                <span className="text-slate-200 print:text-black font-medium">{booking.destination.name}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 mt-3 pt-2 border-t border-slate-800 print:border-slate-200 text-[11px] text-slate-400">
            <div>Distance: <span className="text-slate-200 print:text-black font-bold">{booking.actualDistanceKm || booking.estimatedDistanceKm} km</span></div>
            <div>Duration: <span className="text-slate-200 print:text-black font-bold">{booking.actualDurationMin || booking.estimatedDurationMin} mins</span></div>
          </div>
        </div>

        {/* Itemized Fare Table */}
        <div className="mb-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            {getTranslation(lang, 'fareSummary')}
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60 print:border-slate-200">
              <span className="text-slate-300 print:text-slate-700">{getTranslation(lang, 'baseFare')}</span>
              <span className="font-mono text-slate-200 print:text-black">₹{breakdown?.baseFare || 25}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60 print:border-slate-200">
              <span className="text-slate-300 print:text-slate-700">{getTranslation(lang, 'distanceCharge')} ({breakdown?.distanceKm || booking.estimatedDistanceKm} km)</span>
              <span className="font-mono text-slate-200 print:text-black">₹{breakdown?.distanceCharge || 45}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60 print:border-slate-200">
              <span className="text-slate-300 print:text-slate-700">{getTranslation(lang, 'timeCharge')} ({breakdown?.durationMinutes || booking.estimatedDurationMin} min)</span>
              <span className="font-mono text-slate-200 print:text-black">₹{breakdown?.timeCharge || 15}</span>
            </div>
            {breakdown?.waitingCharge ? (
              <div className="flex justify-between py-1 border-b border-slate-800/60 print:border-slate-200">
                <span className="text-slate-300 print:text-slate-700">{getTranslation(lang, 'waitingCharge')}</span>
                <span className="font-mono text-slate-200 print:text-black">₹{breakdown.waitingCharge}</span>
              </div>
            ) : null}
            {breakdown?.discount ? (
              <div className="flex justify-between py-1 border-b border-slate-800/60 print:border-slate-200 text-emerald-400 print:text-emerald-700">
                <span>{getTranslation(lang, 'discountApplied')}</span>
                <span className="font-mono">-₹{breakdown.discount}</span>
              </div>
            ) : null}
            <div className="flex justify-between py-1 border-b border-slate-800/60 print:border-slate-200 text-slate-400">
              <span>{getTranslation(lang, 'gstTax')} (CGST 2.5% + SGST 2.5%)</span>
              <span className="font-mono text-slate-300 print:text-black">₹{breakdown?.gstAmount || 4}</span>
            </div>
            <div className="flex justify-between py-2 text-sm font-bold text-white print:text-black">
              <span>{getTranslation(lang, 'totalGrossFare')}</span>
              <span className="font-mono text-sky-400 print:text-black">₹{grossFare}</span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Invoice</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-3 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
