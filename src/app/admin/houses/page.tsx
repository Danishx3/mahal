'use client';

import React, { useEffect, useState } from 'react';
import { DataService } from '@/lib/data-service';
import { HouseWithDetails, Division, DIVISION_LABELS, DIVISION_LABELS_ML, ProfileStatus } from '@/lib/supabase/types';
import { divisions } from '@/lib/schemas';
import { useLanguage } from '@/lib/context/LanguageContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  Users,
  Home,
  Search,
  Filter,
  MoreVertical,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Eye,
  Crown,
  MapPin,
  Phone,
  Briefcase,
  GraduationCap,
} from 'lucide-react';

export default function HousesDirectoryPage() {
  const { language } = useLanguage();
  const isMl = language === 'ml';
  const { toast } = useToast();
  const [houses, setHouses] = useState<HouseWithDetails[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState<Division | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ProfileStatus | 'all'>('all');
  const [memberCountFilter, setMemberCountFilter] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Drawer / View Modal
  const [selectedHouse, setSelectedHouse] = useState<HouseWithDetails | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isFiltered =
    searchQuery.trim() !== '' ||
    divisionFilter !== 'all' ||
    statusFilter !== 'all' ||
    memberCountFilter !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setDivisionFilter('all');
    setStatusFilter('all');
    setMemberCountFilter('all');
    setCurrentPage(1);
  };

  const loadData = async () => {
    const list = await DataService.getHousesAsync({
      division: divisionFilter,
      search: searchQuery,
      status: statusFilter,
      memberCount: memberCountFilter,
    });
    setHouses(list);
    setStats(DataService.getSystemStats(list));
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 4000);

    window.addEventListener('mahallu_data_updated', loadData);
    return () => {
      clearInterval(interval);
      window.removeEventListener('mahallu_data_updated', loadData);
    };
  }, [divisionFilter, searchQuery, statusFilter, memberCountFilter]);

  const handleBlockHouse = async (houseId: string) => {
    const confirmMsg = isMl
      ? 'ഈ കുടുംബത്തിന് പോർട്ടൽ സേവനങ്ങൾ തടയാൻ ഉറപ്പാണോ?'
      : 'Are you sure you want to block this household from accessing portal services?';
    if (confirm(confirmMsg)) {
      await DataService.blockHouse(houseId);
      toast(isMl ? 'കുടുംബം തടഞ്ഞുവെച്ചതായി രേഖപ്പെടുത്തി' : 'House marked as blocked', 'info');
      loadData();
    }
  };

  const handleUnblockHouse = async (houseId: string) => {
    await DataService.unblockHouse(houseId);
    toast(
      isMl
        ? 'കുടുംബത്തിന്റെ തടസ്സം നീക്കി അംഗീകൃത നിലയിലേക്ക് പുനഃസ്ഥാപിച്ചു'
        : 'House unblocked and restored to approved status',
      'success'
    );
    loadData();
  };

  const handleDeleteHouse = async (houseId: string, houseName: string) => {
    const confirmMsg = isMl
      ? `"${houseName}" എന്ന വീടും അനുബന്ധ കുടുംബാംഗങ്ങളുടെ എല്ലാ രേഖകളും ശാശ്വതമായി ഇല്ലാതാക്കണോ?`
      : `Permanently delete house "${houseName}" and all associated member records?`;
    if (confirm(confirmMsg)) {
      await DataService.deleteHouse(houseId);
      toast(isMl ? 'കുടുംബത്തിന്റെ രേഖകൾ നീക്കം ചെയ്തു' : 'Household record removed', 'info');
      setDrawerOpen(false);
      loadData();
    }
  };

  // Pagination calculation
  const totalPages = Math.ceil(houses.length / pageSize) || 1;
  const paginatedHouses = houses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isMl ? 'വീടുകളുടെ പട്ടികയും സെൻസസ് രജിസ്ട്രിയും' : 'Houses Directory & Census Registry'}
          </h1>
          <p className="text-xs text-slate-500">
            {isMl
              ? `മഹല്ല് ഡിവിഷനുകളിലെ മുഴുവൻ കുടുംബങ്ങളുടെയും ജനസംഖ്യാ വിവരങ്ങളും (${isFiltered ? `${houses.length} വീടുകൾ` : '250+ വീടുകൾ'}).`
              : `Comprehensive registry of ${isFiltered ? `${houses.length} matching` : '250+'} households across ${
                  divisionFilter !== 'all' ? DIVISION_LABELS[divisionFilter] : 'all 6 local administrative divisions'
                }.`}
          </p>
        </div>
      </div>

      {/* Summary Statistics Bar */}
      {stats && (
        <div className="space-y-2">
          {isFiltered && (
            <div className="flex items-center justify-between text-xs text-slate-600 bg-emerald-50/70 border border-emerald-200/80 rounded-xl px-4 py-2">
              <span className="flex items-center gap-2 font-medium text-emerald-950">
                <Filter className="h-3.5 w-3.5 text-emerald-600" />
                {isMl ? (
                  <>
                    ഫിൽട്ടർ ചെയ്ത വിവരങ്ങൾ: <strong className="font-bold">{stats.totalHouses}</strong> വീടുകൾ
                  </>
                ) : (
                  <>
                    Filtered View: Showing metrics for <strong className="font-bold">{stats.totalHouses}</strong>{' '}
                    {stats.totalHouses === 1 ? 'house' : 'houses'}
                  </>
                )}
                {memberCountFilter !== 'all' && (
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                    {isMl
                      ? `${memberCountFilter} അംഗങ്ങൾ`
                      : memberCountFilter.includes('-') || memberCountFilter.endsWith('+')
                      ? `${memberCountFilter} members`
                      : `${memberCountFilter} ${memberCountFilter === '1' ? 'member' : 'members'}`}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
              >
                {isMl ? 'ഫിൽട്ടറുകൾ ഒഴിവാക്കുക' : 'Reset filters'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                {isMl ? 'ആകെ വീടുകൾ' : 'Total Houses'} {isFiltered && <span className="text-emerald-600 font-bold">*</span>}
              </span>
              <span className="text-xl font-extrabold text-slate-900">{stats.totalHouses}</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                {isMl ? 'സജീവം (അംഗീകരിച്ചത്)' : 'Active (Approved)'}
              </span>
              <span className="text-xl font-extrabold text-emerald-800">{stats.approvedHouses}</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                {isMl ? 'പരിശോധനയിലുള്ളവ' : 'Pending Review'}
              </span>
              <span className="text-xl font-extrabold text-amber-700">{stats.pendingHouses}</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                {isMl ? 'ആകെ ജനസംഖ്യ' : 'Total Population'}
              </span>
              <span className="text-xl font-extrabold text-slate-900">{stats.totalPopulation}</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                {isMl ? 'പ്രവാസികൾ (NRI)' : 'Abroad / NRI'}
              </span>
              <span className="text-xl font-extrabold text-sky-700">{stats.totalAbroad}</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                {isMl ? 'തടഞ്ഞുവെച്ചവ' : 'Blocked'}
              </span>
              <span className="text-xl font-extrabold text-rose-700">{stats.blockedHouses}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                isMl
                  ? 'വീട്ടുപേര്, രജി. നമ്പർ (ഉദാ: MHL-ALU-001), വാർഡ്, കുടുംബാംഗത്തിന്റെ പേര് എന്നിവ തിരയുക...'
                  : 'Search by House Name, Reg No (e.g. MHL-ALU-001), Ward No, or Member Name...'
              }
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
          </div>

          {/* Division Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
            <select
              value={divisionFilter}
              onChange={(e) => {
                setDivisionFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none w-full sm:w-auto font-medium text-slate-700"
            >
              <option value="all">{isMl ? 'എല്ലാ ഡിവിഷനുകളും (6)' : 'All Divisions (6)'}</option>
              {divisions.map((div) => (
                <option key={div} value={div}>
                  {isMl ? (DIVISION_LABELS_ML[div] || div) : DIVISION_LABELS[div]}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none w-full sm:w-auto font-medium text-slate-700"
            >
              <option value="all">{isMl ? 'എല്ലാ നിലകളും' : 'All Statuses'}</option>
              <option value="approved">{isMl ? 'അംഗീകരിച്ചത്' : 'Approved'}</option>
              <option value="pending_verification">{isMl ? 'പരിശോധനയിൽ' : 'Pending'}</option>
              <option value="blocked">{isMl ? 'തടഞ്ഞുവെച്ചത്' : 'Blocked'}</option>
            </select>

            {/* Member Count Dropdown Filter */}
            <select
              id="member-count-filter"
              value={memberCountFilter}
              onChange={(e) => {
                setMemberCountFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none w-full sm:w-auto font-medium text-slate-700"
            >
              <option value="all">{isMl ? 'എല്ലാ അംഗങ്ങളുടെ എണ്ണവും' : 'All Members Count'}</option>
              <option value="1">{isMl ? '1 അംഗം' : '1 Member'}</option>
              <option value="2">{isMl ? '2 അംഗങ്ങൾ' : '2 Members'}</option>
              <option value="3">{isMl ? '3 അംഗങ്ങൾ' : '3 Members'}</option>
              <option value="4">{isMl ? '4 അംഗങ്ങൾ' : '4 Members'}</option>
              <option value="5">{isMl ? '5 അംഗങ്ങൾ' : '5 Members'}</option>
              <option value="6">{isMl ? '6 അംഗങ്ങൾ' : '6 Members'}</option>
              <option value="7">{isMl ? '7 അംഗങ്ങൾ' : '7 Members'}</option>
              <option value="8">{isMl ? '8 അംഗങ്ങൾ' : '8 Members'}</option>
              <option value="9">{isMl ? '9 അംഗങ്ങൾ' : '9 Members'}</option>
              <option value="10">{isMl ? '10 അംഗങ്ങൾ' : '10 Members'}</option>
              <option value="11">{isMl ? '11 അംഗങ്ങൾ' : '11 Members'}</option>
              <option value="12">{isMl ? '12 അംഗങ്ങൾ' : '12 Members'}</option>
              <option value="13">{isMl ? '13 അംഗങ്ങൾ' : '13 Members'}</option>
              <option value="14">{isMl ? '14 അംഗങ്ങൾ' : '14 Members'}</option>
              <option value="15">{isMl ? '15 അംഗങ്ങൾ' : '15 Members'}</option>
              <option value="1-3">{isMl ? '1–3 അംഗങ്ങൾ (ചെറിയ കുടുംബം)' : '1–3 Members (Small)'}</option>
              <option value="4-6">{isMl ? '4–6 അംഗങ്ങൾ (ഇടത്തരം)' : '4–6 Members (Medium)'}</option>
            </select>
          </div>
        </div>

        {/* Quick Member Count Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-slate-100 text-xs pb-1">
          <span className="text-slate-400 font-semibold text-[11px] flex items-center gap-1 mr-1 shrink-0">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            {isMl ? 'അംഗങ്ങളുടെ എണ്ണം:' : 'Filter by Members:'}
          </span>
          {[
            { label: isMl ? 'എല്ലാം' : 'All', value: 'all' },
            { label: '1', value: '1' },
            { label: '2', value: '2' },
            { label: '3', value: '3' },
            { label: '4', value: '4' },
            { label: '5', value: '5' },
            { label: '6', value: '6' },
            { label: '7+', value: '7+' },
            { label: isMl ? '1–3 (ചെറുത്)' : '1–3 (Small)', value: '1-3' },
            { label: isMl ? '4–6 (ഇടത്തരം)' : '4–6 (Medium)', value: '4-6' },
          ].map((btn) => {
            const isActive = memberCountFilter === btn.value;
            return (
              <button
                key={btn.value}
                type="button"
                onClick={() => {
                  setMemberCountFilter(btn.value);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {btn.label}
              </button>
            );
          })}

          {isFiltered && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="ml-auto text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 rounded hover:bg-rose-50 transition-colors shrink-0 whitespace-nowrap cursor-pointer"
            >
              {isMl ? 'ഫിൽട്ടർ മാറ്റുക' : 'Clear filters'}
            </button>
          )}
        </div>
      </div>

      {/* Directory Table & Mobile Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Desktop View: Full Directory Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-6">{isMl ? 'രജി. നമ്പർ' : 'Reg No'}</th>
                <th className="py-3 px-4">{isMl ? 'വീട്ടുപേര്' : 'House Name'}</th>
                <th className="py-3 px-4">{isMl ? 'വാർഡ് / വീട്ടുനമ്പർ' : 'Ward / Door'}</th>
                <th className="py-3 px-4">{isMl ? 'ഡിവിഷൻ' : 'Division'}</th>
                <th className="py-3 px-4">{isMl ? 'കുടുംബനാഥൻ & അംഗങ്ങൾ' : 'Head of Household & Members'}</th>
                <th className="py-3 px-4">{isMl ? 'നില' : 'Status'}</th>
                <th className="py-3 px-6 text-right">{isMl ? 'നിയന്ത്രണങ്ങൾ' : 'Controls'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedHouses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    {isMl
                      ? 'തിരഞ്ഞെടുത്ത ഫിൽട്ടറിന് അനുയോജ്യമായ വീടുകൾ കണ്ടെത്തിയില്ല.'
                      : 'No houses match your search query or filter.'}
                  </td>
                </tr>
              ) : (
                paginatedHouses.map((h) => {
                  const head = h.family_members.find((m) => m.is_head_of_family) || h.family_members[0];
                  const divLabel = isMl
                    ? (DIVISION_LABELS_ML[h.division as Division] || h.division)
                    : (DIVISION_LABELS[h.division as Division] || h.division);
                  const statusLabel = isMl
                    ? h.profile?.status === 'approved'
                      ? 'അംഗീകരിച്ചു'
                      : h.profile?.status === 'blocked'
                      ? 'തടഞ്ഞുവെച്ചു'
                      : 'പരിശോധനയിൽ'
                    : h.profile?.status.replace('_', ' ') || 'Approved';

                  return (
                    <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-6 font-mono font-bold text-emerald-800">
                        {h.mahallu_reg_no}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900">
                        {h.house_name}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {h.house_number}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-700">
                          {divLabel}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{head?.name || '—'}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{h.phone}</span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                            <Users className="w-2.5 h-2.5 text-slate-500" />
                            {h.family_members?.length || 0} {isMl ? 'അംഗങ്ങൾ' : h.family_members?.length === 1 ? 'member' : 'members'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <Badge variant={h.profile?.status || 'approved'} size="sm">
                          {statusLabel}
                        </Badge>
                      </td>

                      <td className="py-3 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedHouse(h);
                              setDrawerOpen(true);
                            }}
                            className="p-1.5 h-auto text-xs gap-1 cursor-pointer"
                            title={isMl ? 'കുടുംബവിവരങ്ങൾ കാണുക' : 'View Full Household & Family'}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {h.profile?.status === 'blocked' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnblockHouse(h.id)}
                              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 h-auto py-1 px-2 text-xs cursor-pointer"
                            >
                              {isMl ? 'തടസ്സം നീക്കുക' : 'Unblock'}
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleBlockHouse(h.id)}
                              className="text-slate-600 hover:text-rose-700 h-auto py-1 px-2 text-xs cursor-pointer"
                              title={isMl ? 'പോർട്ടൽ പ്രവേശനം തടയുക' : 'Block Portal Access'}
                            >
                              {isMl ? 'തടയുക' : 'Block'}
                            </Button>
                          )}

                          <button
                            onClick={() => handleDeleteHouse(h.id, h.house_name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                            title={isMl ? 'രേഖ നീക്കം ചെയ്യുക' : 'Remove Record'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Touch-Optimized House Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {paginatedHouses.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <Home className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">{isMl ? 'വീടുകൾ കണ്ടെത്തിയില്ല' : 'No houses found'}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isMl ? 'ഫിൽട്ടറുകളോ തിരയൽ വാക്കുകളോ മാറ്റി വീണ്ടും ശ്രമിക്കുക.' : 'Try adjusting your filters or search keywords.'}
              </p>
            </div>
          ) : (
            paginatedHouses.map((h) => {
              const head = h.family_members.find((m) => m.is_head_of_family) || h.family_members[0];
              const isBlocked = h.profile?.status === 'blocked';
              const divLabel = isMl
                ? (DIVISION_LABELS_ML[h.division as Division] || h.division)
                : (DIVISION_LABELS[h.division as Division] || h.division);
              const statusLabel = isMl
                ? h.profile?.status === 'approved'
                  ? 'അംഗീകരിച്ചു'
                  : h.profile?.status === 'blocked'
                  ? 'തടഞ്ഞുവെച്ചു'
                  : 'പരിശോധനയിൽ'
                : h.profile?.status.replace('_', ' ') || 'Approved';

              return (
                <div key={`mob-house-${h.id}`} className="p-4 space-y-3 hover:bg-slate-50/60 transition-colors">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{h.house_name}</h3>
                      <div className="flex items-center gap-1.5 mt-1 font-mono text-[11px]">
                        <span className="text-emerald-800 font-bold">{h.mahallu_reg_no}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500 font-sans">{isMl ? 'വാർഡ്' : 'Door'}: {h.house_number}</span>
                      </div>
                    </div>
                    <Badge variant={h.profile?.status || 'approved'} size="sm">
                      {statusLabel}
                    </Badge>
                  </div>

                  {/* Division & Head of Household Details */}
                  <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pb-1 border-b border-slate-200/60">
                      <span className="font-medium text-slate-700">
                        {divLabel}
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold bg-white text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                        <Users className="w-3 h-3 text-slate-500" />
                        {h.family_members?.length || 0} {isMl ? 'അംഗങ്ങൾ' : h.family_members?.length === 1 ? 'member' : 'members'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 font-bold text-slate-800 pt-0.5">
                      <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{isMl ? `കുടുംബനാഥൻ: ${head?.name || '—'}` : `Head: ${head?.name || '—'}`}</span>
                    </div>

                    {h.phone && (
                      <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <a
                          href={`tel:${h.phone}`}
                          className="font-semibold text-emerald-800 hover:underline"
                        >
                          {h.phone}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Touch Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedHouse(h);
                        setDrawerOpen(true);
                      }}
                      className="flex-1 justify-center gap-1.5 min-h-[42px] font-semibold text-xs text-slate-700 cursor-pointer"
                    >
                      <Eye className="h-4 w-4" />
                      <span>{isMl ? 'കുടുംബാംഗങ്ങൾ' : 'View Family'}</span>
                    </Button>

                    {isBlocked ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnblockHouse(h.id)}
                        className="flex-1 justify-center gap-1.5 min-h-[42px] font-semibold text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span>{isMl ? 'തടസ്സം നീക്കുക' : 'Unblock'}</span>
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleBlockHouse(h.id)}
                        className="flex-1 justify-center gap-1.5 min-h-[42px] font-semibold text-xs text-slate-700 hover:text-rose-700 cursor-pointer"
                      >
                        <ShieldAlert className="h-4 w-4" />
                        <span>{isMl ? 'തടയുക' : 'Block Access'}</span>
                      </Button>
                    )}

                    <button
                      onClick={() => handleDeleteHouse(h.id, h.house_name)}
                      className="h-[42px] w-[42px] shrink-0 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
                      title={isMl ? 'രേഖ നീക്കം ചെയ്യുക' : 'Delete House'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Bar */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <span className="text-center sm:text-left">
            {isMl
              ? `ആകെ ${houses.length} ൽ ${(currentPage - 1) * pageSize + 1} മുതൽ ${Math.min(
                  currentPage * pageSize,
                  houses.length
                )} വരെയുള്ള വീടുകൾ`
              : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(
                  currentPage * pageSize,
                  houses.length
                )} of ${houses.length} houses`}
          </span>

          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="py-1.5 px-3 min-h-[38px] cursor-pointer"
            >
              {isMl ? 'മുമ്പത്തേത്' : 'Previous'}
            </Button>
            <span className="font-semibold text-slate-800 px-2">
              {isMl ? `പേജ് ${currentPage} / ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="py-1.5 px-3 min-h-[38px] cursor-pointer"
            >
              {isMl ? 'അടുത്തത്' : 'Next'}
            </Button>
          </div>
        </div>
      </div>

      {/* House & Family Details Modal */}
      <Modal
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedHouse?.house_name || (isMl ? 'വീടിന്റെ വിവരങ്ങൾ' : 'House Details')}
        description={
          isMl
            ? `മഹല്ല് രജി. നമ്പർ: ${selectedHouse?.mahallu_reg_no} • ഡിവിഷൻ: ${
                selectedHouse
                  ? DIVISION_LABELS_ML[selectedHouse.division as Division] || selectedHouse.division
                  : ''
              }`
            : `Mahallu Reg No: ${selectedHouse?.mahallu_reg_no} • Division: ${
                selectedHouse ? DIVISION_LABELS[selectedHouse.division] : ''
              }`
        }
        maxWidth="2xl"
      >
        {selectedHouse && (
          <div className="space-y-6 text-xs">
            {/* Quick Demographics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[10px]">{isMl ? 'വാർഡ് / വീട്ടുനമ്പർ' : 'Door / Ward No'}</span>
                <span className="font-bold text-slate-900">{selectedHouse.house_number}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[10px]">{isMl ? 'ഫോൺ നമ്പർ' : 'Registered Phone'}</span>
                <span className="font-bold text-slate-900">{selectedHouse.phone}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[10px]">{isMl ? 'ആകെ അംഗങ്ങൾ' : 'Total Members'}</span>
                <span className="font-bold text-slate-900">
                  {selectedHouse.family_members.length}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[10px]">{isMl ? 'നില' : 'Status'}</span>
                <Badge variant={selectedHouse.profile?.status || 'approved'} size="sm">
                  {isMl
                    ? selectedHouse.profile?.status === 'approved'
                      ? 'അംഗീകരിച്ചു'
                      : selectedHouse.profile?.status === 'blocked'
                      ? 'തടഞ്ഞുവെച്ചു'
                      : 'പരിശോധനയിൽ'
                    : selectedHouse.profile?.status || 'Approved'}
                </Badge>
              </div>
            </div>

            {/* Family Members Census */}
            <div>
              <h3 className="font-bold uppercase tracking-wider text-slate-400 text-[10px] mb-2">
                {isMl
                  ? `കുടുംബാംഗങ്ങളുടെ സെൻസസ് (${selectedHouse.family_members.length})`
                  : `Census of Inhabitants (${selectedHouse.family_members.length})`}
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">{isMl ? 'പേര്' : 'Name'}</th>
                      <th className="p-2.5">{isMl ? 'ബന്ധം' : 'Relation'}</th>
                      <th className="p-2.5">{isMl ? 'പ്രായം' : 'Age'}</th>
                      <th className="p-2.5">{isMl ? 'തൊഴിൽ' : 'Occupation'}</th>
                      <th className="p-2.5">{isMl ? 'പൊതുവിദ്യാഭ്യാസം' : 'General Education'}</th>
                      <th className="p-2.5">{isMl ? 'മതവിദ്യാഭ്യാസം' : 'Religious Education'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedHouse.family_members.map((m) => (
                      <tr key={m.id} className={m.is_head_of_family ? 'bg-emerald-50/30' : ''}>
                        <td className="p-2.5 font-bold text-slate-900">
                          {m.name}
                          {m.is_head_of_family && (
                            <span className="ml-1.5 inline-flex items-center text-[10px] text-emerald-800 bg-emerald-100 px-1 rounded">
                              {isMl ? 'കുടുംബനാഥൻ' : 'Head'}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-700">{m.relationship}</td>
                        <td className="p-2.5 text-slate-700">{m.age ?? '—'}</td>
                        <td className="p-2.5 text-slate-700">{m.job_status}</td>
                        <td className="p-2.5 text-slate-700">{m.general_education}</td>
                        <td className="p-2.5 text-slate-700">{m.religious_education}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteHouse(selectedHouse.id, selectedHouse.house_name)}
                className="gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isMl ? 'രേഖ നീക്കം ചെയ്യുക' : 'Remove Record'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)}>
                {isMl ? 'അടയ്ക്കുക' : 'Close'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

