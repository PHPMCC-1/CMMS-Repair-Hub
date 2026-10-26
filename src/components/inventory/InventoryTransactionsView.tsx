import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  Package,
  ExternalLink,
  ArrowDownUp,
  FileText,
} from 'lucide-react';

export const InventoryTransactionsView: React.FC = () => {
  const {
    inventory,
    filteredInventory,
    transactions,
    filteredTransactions,
    materialTypeFilter,
    setMaterialTypeFilter,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    resetAllFilters,
    workbookUrls,
    syncStatus,
    isUsingCachedData,
    signInGoogle,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'transactions'>('inventory');

  const availableMaterialTypes = Array.from(new Set(inventory.map(i => i.materialType).filter(Boolean))).sort();
  const availableCategories = Array.from(new Set(inventory.map(i => i.category).filter(Boolean))).sort();

  return (
    <div className="p-3 @md:p-6 max-w-7xl mx-auto space-y-4 @md:space-y-5 text-[#063452] dark:text-[#F0F7F8]">
      {/* Executive Page Header */}
      <div className="flex flex-col @sm:flex-row @sm:items-center justify-between gap-3 bg-white dark:bg-[#07263D] px-4 @md:px-5 py-3.5 @md:py-4 rounded-lg border border-slate-200 dark:border-[#163854] shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-md bg-[#063452] text-[#F37022] flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base @md:text-xl font-bold text-[#063452] dark:text-[#F0F7F8] tracking-tight">
                Materials and Inventory
              </h1>
              <span className="font-mono text-xs font-semibold text-slate-500 dark:text-[#98BAC9]">
                ({activeSubTab === 'inventory' ? `${filteredInventory.length} Items` : `${filteredTransactions.length} Transactions`})
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#98BAC9] truncate">
              Spare parts stock levels, reorder thresholds, and material inbound/outbound transactions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start @sm:self-auto">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#041B2D] px-3 py-1.5 rounded-md border border-slate-200 dark:border-[#163854] text-xs">
            <span className="text-slate-500 dark:text-[#98BAC9] font-medium">View:</span>
            <select
              value={activeSubTab}
              onChange={(e) => setActiveSubTab(e.target.value as 'inventory' | 'transactions')}
              className="bg-transparent font-semibold text-[#063452] dark:text-[#F0F7F8] focus:outline-none cursor-pointer"
            >
              <option value="inventory" className="bg-white dark:bg-[#07263D]">
                Stock Inventory ({inventory.length})
              </option>
              <option value="transactions" className="bg-white dark:bg-[#07263D]">
                Materials Transactions ({transactions.length})
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Expired Token Alert Banner (only if no cached snapshot is present) */}
      {syncStatus === 'token_expired' && !isUsingCachedData && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-lg p-3.5 flex flex-col @sm:flex-row @sm:items-center justify-between gap-3 text-amber-950 dark:text-amber-100 shadow-2xs">
          <div className="flex items-center gap-2.5 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span>Google Sheets access expired — connect Google to load materials inventory and transaction records.</span>
          </div>
          <button
            onClick={signInGoogle}
            className="px-3.5 py-1.5 bg-[#F37022] hover:bg-[#d95f16] text-white text-xs font-semibold rounded-md transition-colors whitespace-nowrap self-start @sm:self-auto"
          >
            Reconnect Google
          </button>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-[#07263D] p-3.5 @md:p-4 rounded-lg border border-slate-200 dark:border-[#163854] shadow-2xs space-y-3">
        <div className="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-4 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, item, make, spec..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] rounded-md text-xs text-[#063452] dark:text-[#F0F7F8] placeholder-slate-400 focus:outline-none focus:border-[#F37022]"
            />
          </div>

          {/* Material Type */}
          <div>
            <select
              value={materialTypeFilter}
              onChange={(e) => setMaterialTypeFilter(e.target.value)}
              className="w-full py-1.5 px-3 bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] rounded-md text-xs text-[#063452] dark:text-[#F0F7F8] focus:outline-none focus:border-[#F37022]"
            >
              <option value="ALL">All Material Types ({availableMaterialTypes.length})</option>
              {availableMaterialTypes.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full py-1.5 px-3 bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] rounded-md text-xs text-[#063452] dark:text-[#F0F7F8] focus:outline-none focus:border-[#F37022]"
            >
              <option value="ALL">All Categories ({availableCategories.length})</option>
              {availableCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Stock Status */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-1.5 px-3 bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] rounded-md text-xs text-[#063452] dark:text-[#F0F7F8] focus:outline-none focus:border-[#F37022]"
            >
              <option value="ALL">All Stock Statuses</option>
              <option value="IN">In Stock</option>
              <option value="LOW">Low Stock / Reorder</option>
              <option value="OUT">Out of Stock</option>
            </select>
          </div>
        </div>

        {(searchQuery || materialTypeFilter !== 'ALL' || categoryFilter !== 'ALL' || statusFilter !== 'ALL') && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-[#163854] text-xs">
            <span className="text-slate-500 dark:text-[#98BAC9]">Filters applied</span>
            <button
              onClick={resetAllFilters}
              className="text-[#F37022] hover:underline font-semibold"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Table Content */}
      {syncStatus === 'signed_out' ? (
        <div className="bg-white dark:bg-[#07263D] border border-slate-200 dark:border-[#163854] rounded-lg p-10 text-center space-y-3">
          <Package className="w-8 h-8 text-[#F37022] mx-auto" />
          <h3 className="text-sm font-semibold text-[#063452] dark:text-[#F0F7F8]">Sign In to Load Materials and Inventory</h3>
          <button
            onClick={signInGoogle}
            className="px-4 py-2 bg-[#063452] dark:bg-[#F37022] text-white text-xs font-semibold rounded-md"
          >
            Sign in with Google
          </button>
        </div>
      ) : activeSubTab === 'inventory' ? (
        /* Inventory Grid Table */
        <div className="bg-white dark:bg-[#07263D] border border-slate-200 dark:border-[#163854] rounded-lg overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-xs">
              <thead>
                <tr>
                  <th className="py-2.5 px-3">Item Code</th>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3">Material Type</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">UOM</th>
                  <th className="py-2.5 px-3">Part # / Make</th>
                  <th className="py-2.5 px-3 text-right">Min / Max</th>
                  <th className="py-2.5 px-3 text-right">In / Out</th>
                  <th className="py-2.5 px-3 text-right">Stock on Hand</th>
                  <th className="py-2.5 px-3">Stock Status</th>
                  <th className="py-2.5 px-3 text-right">Reorder Qty</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length > 0 ? (
                  filteredInventory.map((item) => {
                    const statusUpper = item.stockStatus.toUpperCase();
                    const isLow = statusUpper.includes('LOW') || statusUpper.includes('REORDER');
                    const isOut = statusUpper.includes('OUT');

                    return (
                      <tr key={item.itemCode} className="transition-colors">
                        <td className="py-2.5 px-3 align-middle font-mono font-bold text-[#063452] dark:text-[#F0F7F8] whitespace-nowrap">
                          {item.itemCode}
                        </td>
                        <td className="py-2.5 px-3 align-middle font-semibold text-[#063452] dark:text-[#F0F7F8]">
                          <div>{item.item}</div>
                          {item.specification && (
                            <div className="text-[11px] text-slate-500 dark:text-[#98BAC9] font-normal truncate max-w-xs">{item.specification}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 align-middle text-slate-600 dark:text-[#98BAC9] whitespace-nowrap">
                          {item.materialType}
                        </td>
                        <td className="py-2.5 px-3 align-middle text-slate-600 dark:text-[#98BAC9]">
                          {item.category || '-'}
                        </td>
                        <td className="py-2.5 px-3 align-middle font-mono text-slate-600 dark:text-[#98BAC9] whitespace-nowrap">
                          {item.uom || '-'}
                        </td>
                        <td className="py-2.5 px-3 align-middle text-slate-600 dark:text-[#98BAC9]">
                          {[item.partNumber, item.make].filter(Boolean).join(' / ') || '-'}
                        </td>
                        <td className="py-2.5 px-3 align-middle text-right font-mono tabular-nums text-slate-600 dark:text-[#98BAC9] whitespace-nowrap">
                          {item.min ?? '-'} / {item.max ?? '-'}
                        </td>
                        <td className="py-2.5 px-3 align-middle text-right font-mono tabular-nums text-slate-600 dark:text-[#98BAC9] whitespace-nowrap">
                          +{item.totalInbound ?? 0} / -{item.totalOutbound ?? 0}
                        </td>
                        <td className="py-2.5 px-3 align-middle text-right font-mono tabular-nums font-bold text-[#063452] dark:text-[#F0F7F8]">
                          {item.stockOnHand !== null ? item.stockOnHand : '-'}
                        </td>
                        <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-xs text-[10px] font-semibold border inline-block ${
                            isOut
                              ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              : isLow
                              ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          }`}>
                            {item.stockStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 align-middle text-right font-mono tabular-nums text-[#063452] dark:text-[#F0F7F8]">
                          {item.recommendedReorder !== null && item.recommendedReorder > 0 ? (
                            <span className="font-bold text-[#F37022]">{item.recommendedReorder}</span>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={11} className="py-10 text-center text-slate-400 dark:text-[#98BAC9]/50">
                      No inventory items match filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Transactions Grid Table */
        <div className="bg-white dark:bg-[#07263D] border border-slate-200 dark:border-[#163854] rounded-lg overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-xs">
              <thead>
                <tr>
                  <th className="py-2.5 px-3.5">Transaction #</th>
                  <th className="py-2.5 px-3.5">Date</th>
                  <th className="py-2.5 px-3.5">Type</th>
                  <th className="py-2.5 px-3.5">Item Code</th>
                  <th className="py-2.5 px-3.5">Item Description</th>
                  <th className="py-2.5 px-3.5 text-right">Quantity</th>
                  <th className="py-2.5 px-3.5">UOM</th>
                  <th className="py-2.5 px-3.5">Provider / Supplier</th>
                  <th className="py-2.5 px-3.5">Remarks / Docs</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.transactionNumber + tx.rowNumber} className="transition-colors">
                      <td className="py-2.5 px-3.5 align-middle font-mono font-bold text-[#063452] dark:text-[#F0F7F8] whitespace-nowrap">
                        {tx.transactionNumber}
                      </td>
                      <td className="py-2.5 px-3.5 align-middle font-mono tabular-nums text-slate-600 dark:text-[#98BAC9] whitespace-nowrap">
                        {tx.date || '-'}
                      </td>
                      <td className="py-2.5 px-3.5 align-middle whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-xs text-[10px] font-semibold border inline-block ${
                          tx.transactionType.toLowerCase().includes('in')
                            ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        }`}>
                          {tx.transactionType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 align-middle font-mono text-[#063452] dark:text-[#F0F7F8] whitespace-nowrap">
                        {tx.itemCode || '-'}
                      </td>
                      <td className="py-2.5 px-3.5 align-middle font-medium text-[#063452] dark:text-[#F0F7F8]">
                        {tx.item || '-'}
                      </td>
                      <td className="py-2.5 px-3.5 align-middle text-right font-mono tabular-nums font-bold text-[#063452] dark:text-[#F0F7F8]">
                        {tx.qty !== null ? tx.qty : '-'}
                      </td>
                      <td className="py-2.5 px-3.5 align-middle font-mono text-slate-600 dark:text-[#98BAC9] whitespace-nowrap">
                        {tx.uom || '-'}
                      </td>
                      <td className="py-2.5 px-3.5 align-middle text-slate-600 dark:text-[#98BAC9]">
                        {tx.provider || '-'}
                      </td>
                      <td className="py-2.5 px-3.5 align-middle text-slate-600 dark:text-[#98BAC9] max-w-xs">
                        {tx.supportingDocs && tx.supportingDocs.startsWith('http') ? (
                          <a
                            href={tx.supportingDocs}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#F37022] hover:underline font-semibold"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Supporting Doc</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <span>{tx.supportingDocs || tx.remarks || '-'}</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400 dark:text-[#98BAC9]/50">
                      No material transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
