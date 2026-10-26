import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  FileCheck2,
  ExternalLink,
  Paperclip,
} from 'lucide-react';

export const TransmittalsView: React.FC = () => {
  const {
    transmittals,
    filteredTransmittals,
    clientFilter,
    setClientFilter,
    categoryFilter,
    setCategoryFilter,
    searchQuery,
    setSearchQuery,
    resetAllFilters,
    workbookUrls,
    syncStatus,
    isUsingCachedData,
    signInGoogle,
  } = useApp();

  const availableClients = Array.from(new Set(transmittals.map(t => t.client).filter(Boolean))).sort();
  const availableCategories = Array.from(new Set(transmittals.map(t => t.catergory).filter(Boolean))).sort();

  return (
    <div className="p-3 @md:p-6 max-w-7xl mx-auto space-y-4 @md:space-y-5 text-[#063452] dark:text-[#F0F7F8]">
      {/* Executive Page Header */}
      <div className="flex flex-col @sm:flex-row @sm:items-center justify-between gap-3 bg-white dark:bg-[#07263D] px-4 @md:px-5 py-3.5 @md:py-4 rounded-lg border border-slate-200 dark:border-[#163854] shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-md bg-[#063452] text-[#F37022] flex items-center justify-center shrink-0">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base @md:text-xl font-bold text-[#063452] dark:text-[#F0F7F8] tracking-tight">
                Receiving & Transmittals
              </h1>
              <span className="font-mono text-xs font-semibold text-slate-500 dark:text-[#98BAC9]">
                ({filteredTransmittals.length} records)
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#98BAC9] truncate">
              Documented equipment, parts, and project transmittals and receiving logs.
            </p>
          </div>
        </div>
      </div>

      {/* Expired Token Alert Banner (only if no cached snapshot is present) */}
      {syncStatus === 'token_expired' && !isUsingCachedData && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-lg p-3.5 flex flex-col @sm:flex-row @sm:items-center justify-between gap-3 text-amber-950 dark:text-amber-100 shadow-2xs">
          <div className="flex items-center gap-2.5 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span>Google Sheets access expired — connect Google to load transmittal and receiving manifests.</span>
          </div>
          <button
            onClick={signInGoogle}
            className="px-3.5 py-1.5 bg-[#F37022] hover:bg-[#d95f16] text-white text-xs font-semibold rounded-md transition-colors whitespace-nowrap self-start @sm:self-auto"
          >
            Reconnect Google
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-[#07263D] p-3.5 @md:p-4 rounded-lg border border-slate-200 dark:border-[#163854] shadow-2xs space-y-3">
        <div className="grid grid-cols-1 @sm:grid-cols-3 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transmittal #, client, project, items..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] rounded-md text-xs text-[#063452] dark:text-[#F0F7F8] placeholder-slate-400 focus:outline-none focus:border-[#F37022]"
            />
          </div>

          {/* Client Filter */}
          <div>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full py-1.5 px-3 bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] rounded-md text-xs text-[#063452] dark:text-[#F0F7F8] focus:outline-none focus:border-[#F37022]"
            >
              <option value="ALL">All Clients ({availableClients.length})</option>
              {availableClients.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full py-1.5 px-3 bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] rounded-md text-xs text-[#063452] dark:text-[#F0F7F8] focus:outline-none focus:border-[#F37022]"
            >
              <option value="ALL">All Categories ({availableCategories.length})</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {(searchQuery || clientFilter !== 'ALL' || categoryFilter !== 'ALL') && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-[#163854] text-xs">
            <span className="text-slate-500 dark:text-[#98BAC9]">
              Showing {filteredTransmittals.length} of {transmittals.length} records
            </span>
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
          <FileCheck2 className="w-8 h-8 text-[#F37022] mx-auto" />
          <h3 className="text-sm font-semibold text-[#063452] dark:text-[#F0F7F8]">Sign In to Load Transmittals</h3>
          <button
            onClick={signInGoogle}
            className="px-4 py-2 bg-[#063452] dark:bg-[#F37022] text-white text-xs font-semibold rounded-md"
          >
            Sign in with Google
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#07263D] border border-slate-200 dark:border-[#163854] rounded-lg overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-left text-xs">
              <thead>
                <tr>
                  <th className="py-2.5 px-3.5">Transmittal #</th>
                  <th className="py-2.5 px-3.5">Category</th>
                  <th className="py-2.5 px-3.5">Client & Project</th>
                  <th className="py-2.5 px-3.5">Items Transmitted / Received</th>
                  <th className="py-2.5 px-3.5">Submission Date</th>
                  <th className="py-2.5 px-3.5">Transmitted By</th>
                  <th className="py-2.5 px-3.5">Received By</th>
                  <th className="py-2.5 px-3.5">Files / Attachments</th>
                  <th className="py-2.5 px-3.5">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransmittals.length > 0 ? (
                  filteredTransmittals.map((tr) => (
                    <tr key={tr.transmittalNumber} className="transition-colors">
                      <td className="py-2.5 px-3.5 align-middle font-mono font-bold text-[#063452] dark:text-[#F0F7F8] whitespace-nowrap">
                        {tr.transmittalNumber}
                      </td>
                      <td className="py-2.5 px-3.5 align-middle whitespace-nowrap">
                        <span className="text-slate-600 dark:text-[#98BAC9] font-medium">
                          {tr.catergory || '-'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 align-middle">
                        <div className="font-semibold text-[#063452] dark:text-[#F0F7F8]">{tr.client || '-'}</div>
                        {tr.projectName && (
                          <div className="text-[11px] text-slate-500 dark:text-[#98BAC9] font-normal">{tr.projectName}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 align-middle text-slate-600 dark:text-[#98BAC9] max-w-sm truncate" title={tr.itemsTransmitted}>
                        {tr.itemsTransmitted || '-'}
                      </td>
                      <td className="py-2.5 px-3.5 align-middle font-mono tabular-nums text-slate-600 dark:text-[#98BAC9] whitespace-nowrap">
                        {tr.dateOfSubmission || '-'}
                      </td>
                      <td className="py-2.5 px-3.5 align-middle text-slate-600 dark:text-[#98BAC9] whitespace-nowrap">
                        {tr.transmittedBy || '-'}
                      </td>
                      <td className="py-2.5 px-3.5 align-middle text-slate-600 dark:text-[#98BAC9] whitespace-nowrap">
                        {tr.receivedBy || '-'}
                      </td>
                      <td className="py-2.5 px-3.5 align-middle whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {tr.files && tr.files.startsWith('http') ? (
                            <a
                              href={tr.files}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[#F37022] hover:underline font-semibold"
                            >
                              <Paperclip className="w-3 h-3" />
                              <span>View File</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : tr.files ? (
                            <span className="text-slate-600 dark:text-[#98BAC9]">{tr.files}</span>
                          ) : null}

                          {tr.attachment && tr.attachment.startsWith('http') ? (
                            <a
                              href={tr.attachment}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[#F37022] hover:underline font-semibold"
                            >
                              <Paperclip className="w-3 h-3" />
                              <span>Attachment</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : tr.attachment ? (
                            <span className="text-slate-600 dark:text-[#98BAC9]">{tr.attachment}</span>
                          ) : null}

                          {!tr.files && !tr.attachment && (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 align-middle text-slate-600 dark:text-[#98BAC9] max-w-xs truncate" title={tr.remarks}>
                        {tr.remarks || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400 dark:text-[#98BAC9]/50">
                      No transmittals found matching criteria.
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
