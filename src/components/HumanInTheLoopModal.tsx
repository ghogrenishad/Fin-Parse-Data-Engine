import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Trash2, ShieldAlert, Edit3 } from 'lucide-react';
import { DraftInvoiceItem, PRESET_CATEGORIES } from '../types';

interface HumanInTheLoopModalProps {
  isOpen: boolean;
  rawText: string;
  reasonsForReview: string[];
  confidence?: number;
  initialDraft: DraftInvoiceItem;
  onProcess: (rectifiedText: string, rectifiedDraft: DraftInvoiceItem) => Promise<void>;
  onDelete: () => void;
  processing?: boolean;
}

export const HumanInTheLoopModal: React.FC<HumanInTheLoopModalProps> = ({
  isOpen,
  rawText,
  reasonsForReview,
  confidence,
  initialDraft,
  onProcess,
  onDelete,
  processing = false,
}) => {
  const [editableRawText, setEditableRawText] = useState(rawText);
  const [draft, setDraft] = useState<DraftInvoiceItem>({ ...initialDraft });
  const [amountStr, setAmountStr] = useState<string>(
    initialDraft.amount !== null && initialDraft.amount !== undefined
      ? String(initialDraft.amount)
      : ''
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setEditableRawText(rawText);
    setDraft({ ...initialDraft });
    setAmountStr(
      initialDraft.amount !== null && initialDraft.amount !== undefined
        ? String(initialDraft.amount)
        : ''
    );
    setValidationError(null);
  }, [rawText, initialDraft]);

  if (!isOpen) return null;

  const handleAmountChange = (val: string) => {
    setAmountStr(val);
    const cleaned = val.replace(/[^0-9.-]+/g, '');
    const parsed = parseFloat(cleaned);
    setDraft((prev) => ({
      ...prev,
      amount: isNaN(parsed) ? null : parsed,
    }));
  };

  const handleProcessClick = async () => {
    setValidationError(null);

    // Validate Invoice ID
    const invId = draft.invoice ? draft.invoice.trim() : '';
    if (!invId) {
      setValidationError('Invoice ID cannot be empty. Please specify an Invoice ID before persisting to the database.');
      return;
    }

    try {
      await onProcess(editableRawText, {
        ...draft,
        invoice: invId,
      });
    } catch (err: any) {
      setValidationError(err.message || 'Failed to process and persist record.');
    }
  };

  const confidencePct = confidence !== undefined ? Math.round(confidence * 100) : null;

  return (
    <div
      id="hitl-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="hitl-modal-window"
        className="bg-white border-2 border-[#141414] shadow-[8px_8px_0px_0px_#141414] max-w-2xl w-full flex flex-col overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="p-3.5 bg-amber-500 text-white flex items-center justify-between border-b-2 border-[#141414]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-white shrink-0" />
            <div>
              <h3 className="text-xs font-black tracking-wider uppercase">
                Human-in-the-Loop Validation Required
              </h3>
              <p className="text-[10px] text-amber-100 font-mono">
                AI Triage Guardrail Activated &bull; Manual Review Required Before Persistence
              </p>
            </div>
          </div>
          {confidencePct !== null && (
            <div className="bg-black text-amber-300 text-[10px] font-mono font-bold px-2 py-1 border border-amber-300 flex items-center gap-1">
              <span>CONFIDENCE:</span>
              <span>{confidencePct}%</span>
            </div>
          )}
        </div>

        {/* Nudge Banner */}
        <div className="p-3.5 bg-amber-50/80 border-b border-amber-200 flex flex-col gap-1.5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-bold text-amber-900">
                Action Needed: Validate & Rectify Extracted Invoice Data
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                The AI triage model detected missing mandatory fields or low extraction confidence.
                Please review, rectify the raw text or the extracted fields below, and choose to <strong>Process</strong> into the database or <strong>Delete</strong> to discard.
              </p>
            </div>
          </div>

          {/* Point of failure reasons */}
          {reasonsForReview.length > 0 && (
            <div className="mt-1 pl-6">
              <span className="text-[10px] font-mono font-bold uppercase text-amber-900 tracking-wider">
                Detection Flags:
              </span>
              <ul className="list-disc list-inside text-[11px] text-amber-900/90 font-mono mt-0.5 space-y-0.5">
                {reasonsForReview.map((reason, idx) => (
                  <li key={idx} className="leading-snug">{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Validation error message if user forgot Invoice ID */}
        {validationError && (
          <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs font-mono font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Editable Form Body */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto bg-gray-50/50">
          {/* 1. Editable Raw Input Text */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="hitl-raw-input" className="text-[11px] font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5 font-mono">
                <Edit3 className="w-3 h-3 text-gray-500" />
                <span>Raw Input Text (Editable)</span>
              </label>
              <span className="text-[10px] text-gray-400 font-mono">Edit raw source if needed</span>
            </div>
            <textarea
              id="hitl-raw-input"
              value={editableRawText}
              onChange={(e) => setEditableRawText(e.target.value)}
              rows={3}
              className="w-full p-2.5 text-xs font-mono text-[#141414] bg-white border border-[#141414] focus:outline-hidden focus:ring-1 focus:ring-[#141414] resize-none"
              placeholder="Enter or rectify raw invoice text..."
            />
          </div>

          {/* 2. Rectify Extracted Fields */}
          <div className="border border-gray-300 bg-white p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-800 font-mono">
                Extracted Fields (Editable)
              </span>
              <span className="text-[10px] text-gray-500 font-mono">
                Values will be persisted to Supabase <code className="text-black bg-gray-100 px-1 font-bold">invoicing_data</code>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Invoice ID */}
              <div className="col-span-1">
                <label
                  htmlFor="hitl-field-invoice"
                  className="block text-[10px] font-mono font-bold uppercase text-gray-700 mb-1"
                >
                  Invoice ID <span className="text-rose-600">*</span>
                  {!draft.invoice && (
                    <span className="text-amber-700 ml-1.5 font-normal lowercase">(missing in raw text)</span>
                  )}
                </label>
                <input
                  id="hitl-field-invoice"
                  type="text"
                  value={draft.invoice || ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, invoice: e.target.value }))}
                  placeholder="e.g. INV-2026-0042"
                  className={`w-full px-2.5 py-1.5 text-xs font-mono font-bold text-[#141414] bg-white border ${
                    !draft.invoice ? 'border-amber-500 ring-1 ring-amber-400 bg-amber-50/30' : 'border-[#141414]'
                  } focus:outline-hidden focus:ring-2 focus:ring-[#141414]`}
                />
              </div>

              {/* Amount (Standard natural text input, no spinners) */}
              <div className="col-span-1">
                <label
                  htmlFor="hitl-field-amount"
                  className="block text-[10px] font-mono font-bold uppercase text-gray-700 mb-1"
                >
                  Amount ($ USD)
                  {draft.amount === null && (
                    <span className="text-amber-700 ml-1.5 font-normal lowercase">(missing in raw text)</span>
                  )}
                </label>
                <input
                  id="hitl-field-amount"
                  type="text"
                  value={amountStr}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="e.g. 1420.50 or $1,420.50"
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold text-[#141414] bg-white border border-[#141414] focus:outline-hidden focus:ring-2 focus:ring-[#141414]"
                />
              </div>

              {/* Vendor */}
              <div className="col-span-1">
                <label
                  htmlFor="hitl-field-vendor"
                  className="block text-[10px] font-mono font-bold uppercase text-gray-700 mb-1"
                >
                  Vendor / Merchant
                </label>
                <input
                  id="hitl-field-vendor"
                  type="text"
                  value={draft.vendor || ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, vendor: e.target.value }))}
                  placeholder="e.g. Amazon Web Services"
                  className="w-full px-2.5 py-1.5 text-xs font-mono text-[#141414] bg-white border border-[#141414] focus:outline-hidden focus:ring-2 focus:ring-[#141414]"
                />
              </div>

              {/* Category */}
              <div className="col-span-1">
                <label
                  htmlFor="hitl-field-category"
                  className="block text-[10px] font-mono font-bold uppercase text-gray-700 mb-1"
                >
                  Category
                </label>
                <select
                  id="hitl-field-category"
                  value={draft.category || 'Other'}
                  onChange={(e) => setDraft((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full px-2 py-1.5 text-xs font-mono font-semibold text-[#141414] bg-white border border-[#141414] focus:outline-hidden focus:ring-2 focus:ring-[#141414] cursor-pointer"
                >
                  {PRESET_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="col-span-1">
                <label
                  htmlFor="hitl-field-date"
                  className="block text-[10px] font-mono font-bold uppercase text-gray-700 mb-1"
                >
                  Date
                </label>
                <input
                  id="hitl-field-date"
                  type="date"
                  value={draft.date || ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono text-[#141414] bg-white border border-[#141414] focus:outline-hidden focus:ring-2 focus:ring-[#141414] cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 bg-gray-100 border-t-2 border-[#141414] flex items-center justify-between gap-3">
          {/* Delete button: discards entry without running AI triage and does not persist to DB */}
          <button
            id="hitl-delete-btn"
            type="button"
            onClick={onDelete}
            disabled={processing}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-600 text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
            title="Discard this entry without persisting to database"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          {/* Process button: re-runs triage on rectified data and persists to DB */}
          <button
            id="hitl-process-btn"
            type="button"
            onClick={handleProcessClick}
            disabled={processing}
            className="flex items-center gap-1.5 px-5 py-2 bg-[#141414] hover:bg-gray-800 text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            title="Run AI triage on rectified data and persist to Supabase"
          >
            {processing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Process</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
