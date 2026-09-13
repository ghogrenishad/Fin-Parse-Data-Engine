import React, { useState } from 'react';
import { Sparkles, Trash2, Copy, Check, FileText, MessageSquare, Mail, Layers, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { InvoiceRecord, DraftInvoiceItem } from '../types';
import { HumanInTheLoopModal } from './HumanInTheLoopModal';
import { safeFetchJson } from '../lib/api';

interface Screen1InputProps {
  onParseSuccess: (records: InvoiceRecord[]) => void;
}

const SAMPLE_TEMPLATES = [
  {
    name: 'Slack Message',
    icon: MessageSquare,
    text: `Hey Neha! 
Here is the invoice from Amazon Web Services for our production us-east cluster:
Invoice Ref: #AWS-2026-88219
Total: $1,840.50
Date: 2026-08-21
Category: Cloud Hosting
Can you please process this by end of week? Thanks!`,
  },
  {
    name: 'Incomplete (Triggers HITL)',
    icon: AlertCircle,
    text: `Payment receipt from Google Workspace for monthly subscription. Total charged was $72.00 on 2026-09-02. (Note: Invoice reference number was missing in receipt notification)`,
  },
  {
    name: 'Email Receipt',
    icon: Mail,
    text: `From: billing@figma.com
Subject: Your Figma Organization Subscription Receipt
Date: August 19, 2026

Dear Customer,
Thank you for your payment of $540.00 USD for 12 Editor seats on Figma Enterprise.
Invoice Number: FIG-2026-4491
Payment Method: Visa ending in 4242
Status: Paid in full`,
  },
  {
    name: 'Messy Vendor Bill',
    icon: FileText,
    text: `*** RECEIPT ***
Vendor: Adobe Creative Cloud
Transaction Date: 2026-08-17
Reference #: ADB-991204
Amount: $79.99 USD
Product: All Apps Master Plan (Software & Design)`,
  },
];

export const Screen1Input: React.FC<Screen1InputProps> = ({ onParseSuccess }) => {
  const [rawText, setRawText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastParsedCount, setLastParsedCount] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Human-in-the-Loop State
  const [hitlOpen, setHitlOpen] = useState(false);
  const [hitlDraft, setHitlDraft] = useState<DraftInvoiceItem>({
    invoice: null,
    amount: null,
    vendor: null,
    category: 'Other',
    date: null,
  });
  const [hitlReasons, setHitlReasons] = useState<string[]>([]);
  const [hitlConfidence, setHitlConfidence] = useState<number | undefined>(undefined);
  const [hitlRawText, setHitlRawText] = useState<string>('');
  const [hitlProcessing, setHitlProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) {
      setError('Please enter or paste raw invoice text first.');
      return;
    }

    setParsing(true);
    setError(null);
    setLastParsedCount(null);

    try {
      // 1. Call server Gemini AI triage endpoint
      const result = await safeFetchJson<any>('/api/parse-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText }),
      });

      if (!result || !result.success) {
        throw new Error(result?.error || 'Could not extract invoice fields from text.');
      }

      // 2. Check if Human-in-the-Loop review is required
      if (result.needsHumanReview) {
        setHitlReasons(result.reasonsForReview || ['Human verification required before saving.']);
        setHitlConfidence(result.confidence);
        setHitlRawText(result.rawText || rawText);
        setHitlDraft(
          result.draftInvoices?.[0] || {
            invoice: null,
            amount: null,
            vendor: null,
            category: 'Other',
            date: new Date().toISOString().slice(0, 10),
            rawSnippet: rawText.slice(0, 200),
          }
        );
        setHitlOpen(true);
        return; // Do NOT persist to DB yet!
      }

      if (!result.records || result.records.length === 0) {
        throw new Error('No invoice records could be extracted from input.');
      }

      // 3. Persist verified entries to server / Supabase invoicing_data table
      const saveResult = await safeFetchJson<any>('/api/invoicing-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.records),
      });

      if (!saveResult || !saveResult.success) {
        throw new Error(saveResult?.error || 'Failed to persist records to database.');
      }

      const finalRecords = saveResult.data || result.records;
      setLastParsedCount(finalRecords.length);
      onParseSuccess(finalRecords);
      setRawText(''); // clear text box after successful parse
    } catch (err: any) {
      console.error('Parse error:', err);
      setError(err.message || 'Failed to parse invoice data. Please try again.');
    } finally {
      setParsing(false);
    }
  };

  // Human-in-the-Loop "Process" action: re-runs triage on rectified data and persists to DB
  const handleHitlProcess = async (rectifiedText: string, rectifiedDraft: DraftInvoiceItem) => {
    setHitlProcessing(true);
    try {
      // 1. Check if raw text was rectified; run triage on rectified text
      let recordToPersist: any = null;

      if (rectifiedDraft.invoice && rectifiedDraft.invoice.trim()) {
        // Human explicitly provided/rectified the fields
        recordToPersist = {
          invoice: rectifiedDraft.invoice.trim(),
          amount: rectifiedDraft.amount !== null ? Number(rectifiedDraft.amount) : 0,
          vendor: rectifiedDraft.vendor ? rectifiedDraft.vendor.trim() : 'Unknown Vendor',
          category: rectifiedDraft.category ? rectifiedDraft.category.trim() : 'Other',
          date: rectifiedDraft.date ? rectifiedDraft.date.trim() : new Date().toISOString().slice(0, 10),
          rawSnippet: rectifiedDraft.rawSnippet || rectifiedText.slice(0, 200),
        };
      } else {
        // Re-run AI triage on rectified text
        const parseData = await safeFetchJson<any>('/api/parse-invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawText: rectifiedText }),
        });

        if (!parseData || !parseData.success) {
          throw new Error(parseData?.error || 'Re-triage failed with rectified text.');
        }

        if (parseData.needsHumanReview) {
          setHitlReasons(parseData.reasonsForReview || []);
          setHitlConfidence(parseData.confidence);
          throw new Error('Invoice ID is still missing. Please type an Invoice ID in the field above.');
        }

        recordToPersist = parseData.records?.[0];
      }

      if (!recordToPersist || !recordToPersist.invoice) {
        throw new Error('Please specify a valid Invoice ID.');
      }

      // 2. Persist to Supabase database
      const saveResult = await safeFetchJson<any>('/api/invoicing-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([recordToPersist]),
      });

      if (!saveResult || !saveResult.success) {
        throw new Error(saveResult?.error || 'Failed to persist rectified entry to database.');
      }

      const finalRecords = saveResult.data || [recordToPersist];
      setHitlOpen(false);
      setLastParsedCount(finalRecords.length);
      onParseSuccess(finalRecords);
      setRawText('');
    } catch (err: any) {
      throw err;
    } finally {
      setHitlProcessing(false);
    }
  };

  // Human-in-the-Loop "Delete" action: discards the current entry without running AI triage or persisting to DB
  const handleHitlDelete = () => {
    setHitlOpen(false);
    setHitlDraft({
      invoice: null,
      amount: null,
      vendor: null,
      category: 'Other',
      date: null,
    });
  };

  const handleApplyTemplate = (templateText: string) => {
    setRawText(templateText);
    setError(null);
  };

  const handleCopy = () => {
    if (!rawText) return;
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="screen-1-container" className="bg-white border border-[#141414] flex flex-col h-full overflow-hidden">
      {/* Human-in-the-Loop Validation Modal Window */}
      <HumanInTheLoopModal
        isOpen={hitlOpen}
        rawText={hitlRawText}
        reasonsForReview={hitlReasons}
        confidence={hitlConfidence}
        initialDraft={hitlDraft}
        onProcess={handleHitlProcess}
        onDelete={handleHitlDelete}
        processing={hitlProcessing}
      />

      {/* Screen 1 Header */}
      <div className="p-3 bg-gray-100 border-b border-[#141414] flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-[#141414]">
          <span className="w-2 h-2 bg-orange-500 rounded-full shrink-0"></span>
          Raw Invoice Data
        </h2>
      </div>

      {/* Main Content Area */}
      <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto">
        <p className="text-[11px] leading-relaxed text-[#141414] opacity-75">
          Paste raw text from Slack, email receipts, or OCR text for financial triage and Supabase synchronization.
        </p>

        {/* Quick Sample Presets */}
        <div>
          <div className="text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5 flex items-center justify-between">
            <span>Sample Templates:</span>
            <span className="text-[9px] text-gray-400 font-mono">1-CLICK LOAD</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {SAMPLE_TEMPLATES.map((tmpl, idx) => {
              const Icon = tmpl.icon;
              return (
                <button
                  key={idx}
                  id={`preset-btn-${idx}`}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl.text)}
                  className="flex items-center px-2 py-1.5 border border-[#141414]/30 hover:border-[#141414] bg-white hover:bg-gray-100 text-left text-[11px] text-[#141414] transition-colors group"
                >
                  <Icon className="w-3.5 h-3.5 text-[#141414] mr-1.5 shrink-0" />
                  <span className="font-semibold truncate">{tmpl.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-3">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#141414]">
            <label htmlFor="raw-invoice-input" className="uppercase tracking-wider text-[10px]">
              Raw Invoice Text Input:
            </label>
            <div className="flex items-center gap-2">
              {rawText && (
                <>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center text-[10px] uppercase font-bold text-gray-600 hover:text-[#141414]"
                  >
                    {copied ? <Check className="w-3 h-3 mr-0.5 text-green-700" /> : <Copy className="w-3 h-3 mr-0.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => setRawText('')}
                    className="inline-flex items-center text-[10px] uppercase font-bold text-rose-600 hover:text-rose-800"
                  >
                    <Trash2 className="w-3 h-3 mr-0.5" />
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="relative flex-1 min-h-[190px]">
            <textarea
              id="raw-invoice-input"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Invoice ID: INV-90210&#10;Total: $1,240.50&#10;Vendor: Stellar Global&#10;Category: Logistics&#10;Date: 2026-11-12&#10;..."
              className="w-full h-full min-h-[190px] p-3 text-[12px] font-mono leading-relaxed bg-white border border-[#141414] text-[#141414] resize-none outline-none focus:ring-1 focus:ring-[#141414] placeholder:text-gray-400"
            />
            <div className="absolute bottom-2 right-2 text-[9px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 border border-[#141414]/30">
              {rawText.length} chars
            </div>
          </div>

          {/* AI Extraction Target Schema Note */}
          <div className="p-2.5 bg-gray-50 border border-[#141414] text-[11px] text-[#141414]">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-1">
              <span className="flex items-center">
                <Sparkles className="w-3 h-3 text-orange-600 mr-1" />
                Target Schema: invoicing_data
              </span>
            </div>
            <div className="flex flex-wrap gap-1 font-mono text-[9px] font-bold uppercase">
              <span className="bg-white px-1.5 py-0.5 border border-[#141414]">Invoice ID (Key)</span>
              <span className="bg-white px-1.5 py-0.5 border border-[#141414]">Amount</span>
              <span className="bg-white px-1.5 py-0.5 border border-[#141414]">Vendor</span>
              <span className="bg-white px-1.5 py-0.5 border border-[#141414]">Category</span>
              <span className="bg-white px-1.5 py-0.5 border border-[#141414]">Date</span>
            </div>
          </div>

          {/* Success Banner */}
          {lastParsedCount !== null && (
            <div className="p-2.5 bg-green-50 border border-green-400 text-[11px] font-mono text-green-900 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-green-700 shrink-0" />
                <span>
                  PARSED <strong>{lastParsedCount}</strong> RECORD{lastParsedCount > 1 ? 'S' : ''} & SYNCED TO INVOICINGDATA
                </span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-400 text-[11px] font-mono text-rose-800">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            id="raw-invoice-submit-btn"
            type="submit"
            disabled={parsing || !rawText.trim()}
            className="w-full py-3.5 bg-[#141414] text-white text-xs font-bold uppercase tracking-[0.2em] hover:bg-gray-800 active:bg-black transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {parsing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>PROCESSING & EXTRACTING ENTRIES...</span>
              </>
            ) : (
              <>
                <span>PROCESS & PARSE ENTRIES</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

