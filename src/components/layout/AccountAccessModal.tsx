import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { isClientEquipmentWorkOrder } from '../../types/unifiedSheets';
import {
  X,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Trash2,
  RotateCcw,
  Check,
  Building2,
  Mail,
  User,
} from 'lucide-react';

export const AccountAccessModal: React.FC = () => {
  const {
    isAccountManagerOpen,
    setIsAccountManagerOpen,
    personas,
    activePersona,
    setActivePersona,
    addPersona,
    updatePersona,
    removePersona,
    resetPersonas,
    workOrders,
    transmittals,
    googleUser,
  } = useApp();

  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'client'>('client');
  const [newClientScope, setNewClientScope] = useState<string>('ALL_CLIENT_EQUIPMENT');
  const [formError, setFormError] = useState<string | null>(null);

  // Discover all non-Internal client names from Work Orders and Transmittals
  const discoveredClientNames = useMemo(() => {
    const set = new Set<string>();
    workOrders.forEach((wo) => {
      const c = (wo.client || '').trim();
      if (c && isClientEquipmentWorkOrder(c)) {
        set.add(c);
      }
    });
    transmittals.forEach((tr) => {
      const c = (tr.client || '').trim();
      if (c && isClientEquipmentWorkOrder(c)) {
        set.add(c);
      }
    });
    return Array.from(set).sort();
  }, [workOrders, transmittals]);

  if (!isAccountManagerOpen) return null;

  const adminCount = personas.filter((p) => p.role === 'admin').length;

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const trimmedEmail = newEmail.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }
    const trimmedName = newName.trim() || trimmedEmail.split('@')[0];

    addPersona({
      email: trimmedEmail,
      name: trimmedName,
      role: newRole,
      clientScope: newRole === 'admin' ? 'ALL' : newClientScope,
    });

    setNewEmail('');
    setNewName('');
    setNewRole('client');
    setNewClientScope('ALL_CLIENT_EQUIPMENT');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#041B2D]/75 backdrop-blur-xs flex items-center justify-center p-3 md:p-6">
      <div className="bg-white dark:bg-[#07263D] border border-slate-300 dark:border-[#163854] rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-xs text-[#063452] dark:text-[#F0F7F8]">
        {/* Header */}
        <div className="bg-[#063452] dark:bg-[#041B2D] text-white px-5 py-3.5 flex items-center justify-between border-b border-[#163854]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#F37022] text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold text-white">
                Account & Role Access Control
              </h2>
              <p className="text-[11px] text-slate-300">
                Control which accounts are Admin vs. Client and configure Client Equipment visibility
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAccountManagerOpen(false)}
            className="p-1.5 rounded-xs bg-white/10 hover:bg-rose-600 text-white transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-5">
          {/* Role Rules Explanation Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-md bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[#063452] dark:text-white">
                <ShieldCheck className="w-4 h-4 text-[#F37022] shrink-0" />
                <span>Admin Accounts</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-[#98BAC9] leading-relaxed">
                Full command center access to all GSE units, both <strong>Internal</strong> and <strong>Client Equipment</strong> work orders, inventory, and role settings.
              </p>
            </div>

            <div className="p-3 rounded-md bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[#063452] dark:text-white">
                <UserCheck className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>Client Accounts (Non-Internal Rule)</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-[#98BAC9] leading-relaxed">
                Any work order <strong>not marked as "Internal"</strong> is treated as <strong>Client Equipment</strong>. Client accounts never see "Internal" work orders.
              </p>
            </div>
          </div>

          {/* Add New Account Form */}
          <form
            onSubmit={handleAddAccount}
            className="bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] rounded-md p-3.5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-[#063452] dark:text-[#F0F7F8] flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-[#F37022]" />
                <span>Add Account / Assign Role</span>
              </span>
              {googleUser?.email && (
                <span className="text-[11px] text-slate-500 dark:text-[#98BAC9]">
                  Signed-in Google: <strong className="font-mono text-[#063452] dark:text-white">{googleUser.email}</strong>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-4 relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Email (e.g. user@company.com)"
                  className="w-full pl-8 pr-2.5 py-1.5 bg-white dark:bg-[#07263D] border border-slate-200 dark:border-[#163854] rounded-xs text-xs text-[#063452] dark:text-[#F0F7F8] focus:outline-none focus:border-[#F37022]"
                />
              </div>

              <div className="sm:col-span-3 relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Account Name"
                  className="w-full pl-8 pr-2.5 py-1.5 bg-white dark:bg-[#07263D] border border-slate-200 dark:border-[#163854] rounded-xs text-xs text-[#063452] dark:text-[#F0F7F8] focus:outline-none focus:border-[#F37022]"
                />
              </div>

              <div className="sm:col-span-2">
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'admin' | 'client')}
                  className="w-full py-1.5 px-2 bg-white dark:bg-[#07263D] border border-slate-200 dark:border-[#163854] rounded-xs text-xs font-semibold text-[#063452] dark:text-[#F0F7F8] focus:outline-none focus:border-[#F37022]"
                >
                  <option value="client">Role: Client</option>
                  <option value="admin">Role: Admin</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                {newRole === 'client' ? (
                  <select
                    value={newClientScope}
                    onChange={(e) => setNewClientScope(e.target.value)}
                    className="w-full py-1.5 px-2 bg-white dark:bg-[#07263D] border border-slate-200 dark:border-[#163854] rounded-xs text-xs text-[#063452] dark:text-[#F0F7F8] focus:outline-none focus:border-[#F37022]"
                  >
                    <option value="ALL_CLIENT_EQUIPMENT">All Client Equipment (Non-Internal)</option>
                    {discoveredClientNames.map((c) => (
                      <option key={c} value={c}>
                        Client: {c}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="py-1.5 px-2.5 bg-slate-100 dark:bg-[#07263D]/60 border border-slate-200 dark:border-[#163854] rounded-xs text-[11px] text-slate-500 dark:text-[#98BAC9] truncate">
                    All Internal & Client Data
                  </div>
                )}
              </div>
            </div>

            {formError && (
              <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                {formError}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-[#F37022] hover:bg-[#d95f16] text-white font-semibold rounded-xs transition-colors flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Save Account</span>
              </button>
            </div>
          </form>

          {/* Accounts Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-[#98BAC9]">
                Configured Accounts ({personas.length})
              </h3>
              <button
                onClick={resetPersonas}
                className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-[#98BAC9] hover:text-[#F37022] font-medium"
                title="Reset to default accounts"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Defaults</span>
              </button>
            </div>

            <div className="border border-slate-200 dark:border-[#163854] rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-xs">
                  <thead>
                    <tr>
                      <th className="py-2.5 px-3">Account & Email</th>
                      <th className="py-2.5 px-3">Access Role</th>
                      <th className="py-2.5 px-3">Equipment & Work Order Scope</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personas.map((p) => {
                      const isCurrentActive =
                        activePersona.email.toLowerCase() === p.email.toLowerCase();
                      const isSignedInGoogle =
                        googleUser?.email?.toLowerCase() === p.email.toLowerCase();
                      const isLastAdmin = p.role === 'admin' && adminCount <= 1;

                      return (
                        <tr key={p.email} className="transition-colors">
                          <td className="py-2.5 px-3 align-middle">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-6 h-6 rounded-xs flex items-center justify-center text-xs font-bold shrink-0 ${p.avatarBg}`}
                              >
                                {p.avatarLetter}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-[#063452] dark:text-[#F0F7F8] flex items-center gap-1.5 flex-wrap">
                                  <span>{p.name}</span>
                                  {isCurrentActive && (
                                    <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                      Active View
                                    </span>
                                  )}
                                  {isSignedInGoogle && (
                                    <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-semibold bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                                      Google Session
                                    </span>
                                  )}
                                </div>
                                <div className="font-mono text-[11px] text-slate-500 dark:text-[#98BAC9]">
                                  {p.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role Switcher (Admin vs Client) */}
                          <td className="py-2.5 px-3 align-middle whitespace-nowrap">
                            <div className="inline-flex rounded-xs border border-slate-200 dark:border-[#163854] overflow-hidden bg-slate-100 dark:bg-[#041B2D] p-0.5">
                              <button
                                type="button"
                                onClick={() => updatePersona(p.email, { role: 'admin' })}
                                className={`px-2.5 py-1 rounded-xs text-[11px] font-semibold transition-colors ${
                                  p.role === 'admin'
                                    ? 'bg-[#063452] text-white shadow-2xs'
                                    : 'text-slate-600 dark:text-[#98BAC9] hover:text-[#063452] dark:hover:text-white'
                                }`}
                              >
                                Admin
                              </button>
                              <button
                                type="button"
                                disabled={isLastAdmin}
                                onClick={() =>
                                  updatePersona(p.email, {
                                    role: 'client',
                                    clientScope:
                                      p.clientScope && p.clientScope !== 'ALL'
                                        ? p.clientScope
                                        : 'ALL_CLIENT_EQUIPMENT',
                                  })
                                }
                                title={
                                  isLastAdmin
                                    ? 'At least one Admin account is required'
                                    : 'Switch account to Client role'
                                }
                                className={`px-2.5 py-1 rounded-xs text-[11px] font-semibold transition-colors disabled:opacity-40 ${
                                  p.role === 'client'
                                    ? 'bg-[#F37022] text-white shadow-2xs'
                                    : 'text-slate-600 dark:text-[#98BAC9] hover:text-[#063452] dark:hover:text-white'
                                }`}
                              >
                                Client
                              </button>
                            </div>
                          </td>

                          {/* Client Equipment Scope */}
                          <td className="py-2.5 px-3 align-middle">
                            {p.role === 'admin' ? (
                              <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-[#98BAC9] font-medium">
                                <ShieldCheck className="w-3.5 h-3.5 text-[#F37022] shrink-0" />
                                <span>Full Access (Internal + All Clients)</span>
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <select
                                  value={p.clientScope || 'ALL_CLIENT_EQUIPMENT'}
                                  onChange={(e) =>
                                    updatePersona(p.email, { clientScope: e.target.value })
                                  }
                                  className="py-1 px-2 bg-slate-50 dark:bg-[#041B2D] border border-slate-200 dark:border-[#163854] rounded-xs text-[11px] font-medium text-[#063452] dark:text-[#F0F7F8] focus:outline-none focus:border-[#F37022]"
                                >
                                  <option value="ALL_CLIENT_EQUIPMENT">
                                    All Client Equipment (Not Marked "Internal")
                                  </option>
                                  {discoveredClientNames.map((c) => (
                                    <option key={c} value={c}>
                                      Specific Client: {c}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-3 align-middle text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {!isCurrentActive ? (
                                <button
                                  type="button"
                                  onClick={() => setActivePersona(p)}
                                  className="px-2.5 py-1 rounded-xs bg-slate-100 dark:bg-[#041B2D] hover:bg-[#063452] hover:text-white dark:hover:bg-[#F37022] text-[#063452] dark:text-[#F0F7F8] text-[11px] font-semibold transition-colors"
                                >
                                  Switch to View
                                </button>
                              ) : (
                                <span className="px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Viewing</span>
                                </span>
                              )}

                              <button
                                type="button"
                                disabled={personas.length <= 1 || isLastAdmin}
                                onClick={() => removePersona(p.email)}
                                title={
                                  isLastAdmin
                                    ? 'Cannot delete the only Admin account'
                                    : 'Remove account'
                                }
                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-30 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-[#041B2D] border-t border-slate-200 dark:border-[#163854] flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-[#98BAC9]">
            Currently viewing as: <strong className="text-[#063452] dark:text-white">{activePersona.name} ({activePersona.role.toUpperCase()})</strong>
          </span>
          <button
            type="button"
            onClick={() => setIsAccountManagerOpen(false)}
            className="px-4 py-1.5 bg-[#063452] hover:bg-[#09476e] dark:bg-[#F37022] dark:hover:bg-[#d95f16] text-white text-xs font-semibold rounded-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
