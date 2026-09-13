import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Trash2, 
  Lock, 
  Check, 
  Calendar, 
  DollarSign, 
  Tag, 
  Building2,  
  RefreshCw,
  ArrowUpDown
} from 'lucide-react';
import { InvoiceRecord, PeriodFilter, PRESET_CATEGORIES } from '../types';

interface Screen2SpreadsheetProps {
  invoices: InvoiceRecord[];
  onUpdateInvoice: (id: string, updatedFields: Partial<InvoiceRecord>) => Promise<void>;
  onDeleteInvoice: (id: string) => Promise<void>;
  onAddManualRow: () => Promise<void>;
  onRefresh: () => void;
  savingId: string | null;
}

export const Screen2Spreadsheet: React.FC<Screen2SpreadsheetProps> = ({
  invoices,
  onUpdateInvoice,
  onDeleteInvoice,
  onAddManualRow,
  onRefresh,
  savingId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof InvoiceRecord>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filter and sort invoices
  const filteredInvoices = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return invoices.filter((item) => {
      // 1. Search filter
      const matchesSearch =
        item.invoice.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.amount.toString().includes(searchTerm);

      if (!matchesSearch) return false;

      // 2. Category filter
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }

      // 3. Period filter (PRD requirement: all time, month, week)
      if (periodFilter === 'month') {
        const itemDate = new Date(item.date);
        if (isNaN(itemDate.getTime())) return true;
        const isCurrentMonth =
          itemDate.getFullYear() === currentYear && itemDate.getMonth() === currentMonth;
        if (!isCurrentMonth) return false;
      } else if (periodFilter === 'week') {
        const itemDate = new Date(item.date);
        if (isNaN(itemDate.getTime())) return true;
        const diffTime = Math.abs(now.getTime() - itemDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 7) return false;
      }

      return true;
    }).sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'amount') {
        return sortDirection === 'asc' ? (a.amount - b.amount) : (b.amount - a.amount);
      }
      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;
      if (sortDirection === 'asc') {
        return String(aVal).localeCompare(String(bVal));
      } else {
        return String(bVal).localeCompare(String(aVal));
      }
    });
  }, [invoices, searchTerm, periodFilter, categoryFilter, sortField, sortDirection]);

  // Statistics calculation
  const stats = useMemo(() => {
    const totalAmount = filteredInvoices.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const count = filteredInvoices.length;
    const avg = count > 0 ? totalAmount / count : 0;
    
    const catMap: Record<string, number> = {};
    filteredInvoices.forEach((i) => {
      catMap[i.category] = (catMap[i.category] || 0) + (Number(i.amount) || 0);
    });
    let topCategory = 'None';
    let maxCatVal = 0;
    Object.entries(catMap).forEach(([cat, val]) => {
      if (val > maxCatVal) {
        maxCatVal = val;
        topCategory = cat;
      }
    });

    return { totalAmount, count, avg, topCategory };
  }, [filteredInvoices]);

  const handleSort = (field: keyof InvoiceRecord) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) return;
    const headers = ['Invoice', 'Amount', 'Vendor', 'Category', 'Date'];
    const rows = filteredInvoices.map((inv) => [
      `"${inv.invoice.replace(/"/g, '""')}"`,
      inv.amount,
      `"${inv.vendor.replace(/"/g, '""')}"`,
      `"${inv.category.replace(/"/g, '""')}"`,
      inv.date,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `InvoicingData_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="screen-2-container" className="bg-white border border-[#141414] flex flex-col h-full overflow-hidden">
      {/* Screen 2 Top Header */}
      <div className="p-3 border-b border-[#141414] flex flex-wrap justify-between items-center gap-2 bg-gray-100">

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-green-100 text-green-900 text-[10px] font-bold uppercase border border-[#141414] font-mono">
            CONNECTED: SUPABASE
          </span>
          <span className="px-2 py-0.5 bg-gray-200 text-gray-800 text-[10px] font-bold uppercase border border-[#141414] font-mono">
            RECORDS: {invoices.length}
          </span>
          
          {/* Refresh */}
          <button
            id="refresh-invoices-btn"
            onClick={onRefresh}
            title="Refresh database records"
            className="p-1 text-[#141414] hover:bg-gray-200 border border-[#141414] bg-white transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
          </button>

          {/* Export CSV */}
          <button
            id="export-csv-btn"
            onClick={handleExportCSV}
            className="px-2.5 py-0.5 text-[10px] font-bold uppercase border border-[#141414] bg-white text-[#141414] hover:bg-[#141414] hover:text-white transition-colors"
            title="Download CSV"
          >
            <Download className="w-3 h-3 inline mr-1" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Add Row */}
          <button
            id="add-manual-row-btn"
            onClick={onAddManualRow}
            className="px-2.5 py-0.5 text-[10px] font-bold uppercase border border-[#141414] bg-[#141414] text-white hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-3 h-3 inline mr-1" />
            <span>+ Add Row</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#141414] bg-gray-50 text-[11px] font-mono">
        <div className="p-2 border-r border-[#141414] sm:border-r">
          <div className="text-[9px] uppercase font-bold text-gray-500">TOTAL INVOICED</div>
          <div className="text-xs font-bold text-[#141414]">
            ${stats.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="p-2 border-r border-[#141414] sm:border-r">
          <div className="text-[9px] uppercase font-bold text-gray-500">FILTERED COUNT</div>
          <div className="text-xs font-bold text-[#141414]">{stats.count} ROWS</div>
        </div>
        <div className="p-2 border-r border-[#141414] sm:border-r">
          <div className="text-[9px] uppercase font-bold text-gray-500">TOP CATEGORY</div>
          <div className="text-xs font-bold text-[#141414] truncate">{stats.topCategory}</div>
        </div>
        <div className="p-2">
          <div className="text-[9px] uppercase font-bold text-gray-500">AVG TICKET</div>
          <div className="text-xs font-bold text-[#141414]">
            ${stats.avg.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Controls & Filter Toolbar */}
      <div className="p-2 border-b border-[#141414] bg-white flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[150px] max-w-xs">
          <Search className="w-3 h-3 absolute left-2 top-2 text-gray-400" />
          <input
            id="spreadsheet-search-input"
            type="text"
            placeholder="FILTER ENTRIES..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7 pr-2 py-1 text-[11px] font-mono bg-white border border-[#141414] text-[#141414] outline-none focus:ring-1 focus:ring-[#141414] placeholder:text-gray-400 uppercase"
          />
        </div>

        {/* Period Filter */}
        <div className="flex items-center border border-[#141414] bg-gray-100 text-[10px] font-bold uppercase tracking-wider">
          <button
            id="period-filter-all"
            onClick={() => setPeriodFilter('all')}
            className={`px-2.5 py-1 transition-colors ${
              periodFilter === 'all' ? 'bg-[#141414] text-white' : 'text-[#141414] hover:bg-gray-200'
            }`}
          >
            All Time
          </button>
          <button
            id="period-filter-month"
            onClick={() => setPeriodFilter('month')}
            className={`px-2.5 py-1 border-l border-[#141414] transition-colors ${
              periodFilter === 'month' ? 'bg-[#141414] text-white' : 'text-[#141414] hover:bg-gray-200'
            }`}
          >
            This Month
          </button>
          <button
            id="period-filter-week"
            onClick={() => setPeriodFilter('week')}
            className={`px-2.5 py-1 border-l border-[#141414] transition-colors ${
              periodFilter === 'week' ? 'bg-[#141414] text-white' : 'text-[#141414] hover:bg-gray-200'
            }`}
          >
            This Week
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1">
          <select
            id="category-filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-[11px] font-mono font-semibold bg-white border border-[#141414] px-2 py-1 outline-none text-[#141414] uppercase cursor-pointer"
          >
            <option value="all">ALL CATEGORIES</option>
            {PRESET_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* Real-time Save status feedback */}
        <div className="text-[10px] font-mono font-bold uppercase text-[#141414] flex items-center">
          {savingId ? (
            <span className="text-orange-700 flex items-center">
              <span className="w-1.5 h-1.5 bg-orange-600 mr-1 animate-ping"></span>
              SYNCING TO DB...
            </span>
          ) : (
            <span className="text-green-800 flex items-center">
              <Check className="w-3 h-3 mr-0.5 text-green-700" />
              LIVE SYNC PERSISTED
            </span>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="flex-1 overflow-auto bg-white font-mono text-[11px]">
        {/* Table Headers */}
        <div className="grid grid-cols-12 bg-[#141414] text-white py-2 px-0 text-[10px] font-bold uppercase tracking-wider sticky top-0 z-10 select-none">
          <div className="col-span-1 px-2 py-0.5 text-center border-r border-gray-700 text-gray-400">#</div>
          <div
            onClick={() => handleSort('invoice')}
            className="col-span-3 px-3 py-0.5 border-r border-gray-700 cursor-pointer hover:bg-gray-800 flex items-center justify-between"
          >
            <div className="flex items-center gap-1">
              <span>Invoice ID</span>
              <span className="text-[8px] bg-gray-800 text-gray-300 px-1 border border-gray-600">LOCKED</span>
            </div>
            <ArrowUpDown className="w-2.5 h-2.5 text-gray-400" />
          </div>
          <div
            onClick={() => handleSort('amount')}
            className="col-span-2 px-3 py-0.5 border-r border-gray-700 cursor-pointer hover:bg-gray-800 flex items-center justify-between"
          >
            <span>Amount ($)</span>
            <ArrowUpDown className="w-2.5 h-2.5 text-gray-400" />
          </div>
          <div
            onClick={() => handleSort('vendor')}
            className="col-span-2 px-3 py-0.5 border-r border-gray-700 cursor-pointer hover:bg-gray-800 flex items-center justify-between"
          >
            <span>Vendor</span>
            <ArrowUpDown className="w-2.5 h-2.5 text-gray-400" />
          </div>
          <div
            onClick={() => handleSort('category')}
            className="col-span-2 px-3 py-0.5 border-r border-gray-700 cursor-pointer hover:bg-gray-800 flex items-center justify-between"
          >
            <span>Category</span>
            <ArrowUpDown className="w-2.5 h-2.5 text-gray-400" />
          </div>
          <div
            onClick={() => handleSort('date')}
            className="col-span-1 px-2 py-0.5 border-r border-gray-700 cursor-pointer hover:bg-gray-800 flex items-center justify-between"
          >
            <span>Date</span>
            <ArrowUpDown className="w-2.5 h-2.5 text-gray-400" />
          </div>
          <div className="col-span-1 px-1 py-0.5 text-center text-gray-400">ACT</div>
        </div>

        {/* Table Body */}
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-xs font-bold uppercase tracking-wider text-[#141414]">No records</p>
          </div>
        ) : (
          <div>
            {filteredInvoices.map((inv, index) => (
              <div
                key={inv.id}
                id={`invoice-row-${inv.id}`}
                className="grid grid-cols-12 border-b border-gray-300 hover:bg-blue-50/70 transition-colors group text-[#141414] items-center"
              >
                {/* Index */}
                <div className="col-span-1 px-2 py-2 text-center border-r border-gray-200 bg-gray-50 text-gray-400 font-mono text-[10px]">
                  {index + 1}
                </div>

                {/* 1. Invoice ID (Locked / Read-only) */}
                <div className="col-span-3 px-3 py-2 border-r border-gray-200 bg-gray-50 font-bold text-gray-800 flex items-center justify-between">
                  <span className="truncate">{inv.invoice}</span>
                  <Lock className="w-2.5 h-2.5 text-gray-400 shrink-0 ml-1" title="Invoice ID is immutable" />
                </div>

                {/* 2. Amount (Editable) */}
                <div className="col-span-2 px-2 py-1 border-r border-gray-200">
                  <input
                    id={`input-amount-${inv.id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={inv.amount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      onUpdateInvoice(inv.id, { amount: val });
                    }}
                    className="w-full px-1.5 py-1 text-[11px] font-mono font-bold text-[#141414] bg-transparent hover:bg-gray-100 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#141414] border border-transparent hover:border-gray-300 text-right"
                  />
                </div>

                {/* 3. Vendor (Editable) */}
                <div className="col-span-2 px-2 py-1 border-r border-gray-200">
                  <input
                    id={`input-vendor-${inv.id}`}
                    type="text"
                    value={inv.vendor}
                    onChange={(e) => onUpdateInvoice(inv.id, { vendor: e.target.value })}
                    className="w-full px-1.5 py-1 text-[11px] font-mono text-[#141414] bg-transparent hover:bg-gray-100 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#141414] border border-transparent hover:border-gray-300 truncate"
                  />
                </div>

                {/* 4. Category (Editable) */}
                <div className="col-span-2 px-2 py-1 border-r border-gray-200">
                  <select
                    id={`select-category-${inv.id}`}
                    value={inv.category}
                    onChange={(e) => onUpdateInvoice(inv.id, { category: e.target.value })}
                    className="w-full px-1 py-1 text-[10px] font-mono font-semibold text-[#141414] bg-transparent hover:bg-gray-100 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#141414] border border-transparent hover:border-gray-300 cursor-pointer uppercase"
                  >
                    {PRESET_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                    ))}
                    {!PRESET_CATEGORIES.includes(inv.category as any) && (
                      <option value={inv.category}>{inv.category.toUpperCase()}</option>
                    )}
                  </select>
                </div>

                {/* 5. Date (Editable) */}
                <div className="col-span-1 px-1 py-1 border-r border-gray-200">
                  <input
                    id={`input-date-${inv.id}`}
                    type="date"
                    value={inv.date}
                    onChange={(e) => onUpdateInvoice(inv.id, { date: e.target.value })}
                    className="w-full px-0.5 py-1 text-[10px] font-mono text-[#141414] bg-transparent hover:bg-gray-100 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#141414] border border-transparent hover:border-gray-300 cursor-pointer"
                  />
                </div>

                {/* Actions (Delete) */}
                <div className="col-span-1 px-1 py-1 text-center">
                  <button
                    id={`delete-btn-${inv.id}`}
                    onClick={() => onDeleteInvoice(inv.id)}
                    title="Delete record"
                    className="text-gray-400 hover:text-rose-700 p-1 transition-colors hover:bg-rose-50"
                  >
                    <Trash2 className="w-3 h-3 mx-auto" />
                  </button>
                </div>
              </div>
            ))}

            {/* Empty Row Grid Fillers */}
            <div className="grid grid-cols-12 border-b border-gray-200 h-8 bg-gray-50/40 opacity-40"></div>
            <div className="grid grid-cols-12 border-b border-gray-200 h-8 bg-gray-50/40 opacity-40"></div>
            <div className="grid grid-cols-12 border-b border-gray-200 h-8 bg-gray-50/40 opacity-40"></div>
          </div>
        )}
      </div>

      {/* Footer Status Bar */}
      <footer className="px-4 py-2 bg-gray-200 border-t border-[#141414] flex justify-between items-center text-[9px] uppercase font-bold text-gray-700 font-mono">
        <div>
          SYNC STATUS: <span className="text-green-700">LIVE (SUPABASE)</span>
        </div>
        <div>
          SHOWING {filteredInvoices.length} OF {invoices.length} INVOICES
        </div>
        <div>
          SCHEMA: <span className="text-[#141414]">invoicing_data</span>
        </div>
      </footer>
    </div>
  );
};

