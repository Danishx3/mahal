'use client';

import React, { useEffect, useState } from 'react';
import { DataService } from '@/lib/data-service';
import { HouseWithDetails, Division, DIVISION_LABELS, ProfileStatus } from '@/lib/supabase/types';
import { divisions } from '@/lib/schemas';
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
  const { toast } = useToast();
  const [houses, setHouses] = useState<HouseWithDetails[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState<Division | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ProfileStatus | 'all'>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Drawer / View Modal
  const [selectedHouse, setSelectedHouse] = useState<HouseWithDetails | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadData = async () => {
    await DataService.syncHousesFromSupabase();
    setStats(DataService.getSystemStats());
    const list = DataService.getHouses({
      division: divisionFilter,
      search: searchQuery,
      status: statusFilter,
    });
    setHouses(list);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('mahallu_data_updated', loadData);
    return () => window.removeEventListener('mahallu_data_updated', loadData);
  }, [divisionFilter, searchQuery, statusFilter]);

  const handleBlockHouse = async (houseId: string) => {
    if (confirm('Are you sure you want to block this household from accessing portal services?')) {
      await DataService.blockHouse(houseId);
      toast('House marked as blocked', 'info');
      loadData();
    }
  };

  const handleUnblockHouse = async (houseId: string) => {
    await DataService.unblockHouse(houseId);
    toast('House unblocked and restored to approved status', 'success');
    loadData();
  };

  const handleDeleteHouse = async (houseId: string, houseName: string) => {
    if (confirm(`Permanently delete house "${houseName}" and all associated member records?`)) {
      await DataService.deleteHouse(houseId);
      toast('Household record removed', 'info');
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
            Houses Directory & Census Registry
          </h1>
          <p className="text-xs text-slate-500">
            Comprehensive registry of 250+ households across all 6 local administrative divisions.
          </p>
        </div>
      </div>

      {/* Summary Statistics Bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Total Houses</span>
            <span className="text-xl font-extrabold text-slate-900">{stats.totalHouses}</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Active (Approved)</span>
            <span className="text-xl font-extrabold text-emerald-800">{stats.approvedHouses}</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Pending Review</span>
            <span className="text-xl font-extrabold text-amber-700">{stats.pendingHouses}</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Total Population</span>
            <span className="text-xl font-extrabold text-slate-900">{stats.totalPopulation}</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Abroad / NRI</span>
            <span className="text-xl font-extrabold text-sky-700">{stats.totalAbroad}</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase">Blocked</span>
            <span className="text-xl font-extrabold text-rose-700">{stats.blockedHouses}</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by House Name, Reg No (e.g. MHL-ALU-001), Ward No, or Member Name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
          />
        </div>

        {/* Division Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={divisionFilter}
            onChange={(e) => {
              setDivisionFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none w-full md:w-auto"
          >
            <option value="all">All Divisions (6)</option>
            {divisions.map((div) => (
              <option key={div} value={div}>
                {DIVISION_LABELS[div]}
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
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none w-full md:w-auto"
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending_verification">Pending</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-6">Reg No</th>
                <th className="py-3 px-4">House Name</th>
                <th className="py-3 px-4">Ward / Door</th>
                <th className="py-3 px-4">Division</th>
                <th className="py-3 px-4">Head of Household</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-6 text-right">Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedHouses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No houses match your search query or filter.
                  </td>
                </tr>
              ) : (
                paginatedHouses.map((h) => {
                  const head = h.family_members.find((m) => m.is_head_of_family) || h.family_members[0];
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
                          {DIVISION_LABELS[h.division as Division]}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{head?.name || '—'}</div>
                        <div className="text-[11px] text-slate-400">{h.phone}</div>
                      </td>

                      <td className="py-3 px-4">
                        <Badge variant={h.profile?.status || 'approved'} size="sm">
                          {h.profile?.status.replace('_', ' ') || 'Approved'}
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
                            className="p-1.5 h-auto text-xs gap-1"
                            title="View Full Household & Family"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {h.profile?.status === 'blocked' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnblockHouse(h.id)}
                              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 h-auto py-1 px-2 text-xs"
                            >
                              Unblock
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleBlockHouse(h.id)}
                              className="text-slate-600 hover:text-rose-700 h-auto py-1 px-2 text-xs"
                              title="Block Portal Access"
                            >
                              Block
                            </Button>
                          )}

                          <button
                            onClick={() => handleDeleteHouse(h.id, h.house_name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                            title="Remove Record"
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

        {/* Pagination Bar */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, houses.length)} of {houses.length} houses
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="py-1 px-2.5"
            >
              Previous
            </Button>
            <span className="font-semibold text-slate-800">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="py-1 px-2.5"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* House & Family Details Modal */}
      <Modal
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedHouse?.house_name || 'House Details'}
        description={`Mahallu Reg No: ${selectedHouse?.mahallu_reg_no} • Division: ${
          selectedHouse ? DIVISION_LABELS[selectedHouse.division] : ''
        }`}
        maxWidth="2xl"
      >
        {selectedHouse && (
          <div className="space-y-6 text-xs">
            {/* Quick Demographics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Door / Ward No</span>
                <span className="font-bold text-slate-900">{selectedHouse.house_number}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Registered Phone</span>
                <span className="font-bold text-slate-900">{selectedHouse.phone}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Total Members</span>
                <span className="font-bold text-slate-900">
                  {selectedHouse.family_members.length}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Status</span>
                <Badge variant={selectedHouse.profile?.status || 'approved'} size="sm">
                  {selectedHouse.profile?.status || 'Approved'}
                </Badge>
              </div>
            </div>

            {/* Family Members Census */}
            <div>
              <h3 className="font-bold uppercase tracking-wider text-slate-400 text-[10px] mb-2">
                Census of Inhabitants ({selectedHouse.family_members.length})
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">Relation</th>
                      <th className="p-2.5">Age</th>
                      <th className="p-2.5">Occupation</th>
                      <th className="p-2.5">General Education</th>
                      <th className="p-2.5">Religious Education</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedHouse.family_members.map((m) => (
                      <tr key={m.id} className={m.is_head_of_family ? 'bg-emerald-50/30' : ''}>
                        <td className="p-2.5 font-bold text-slate-900">
                          {m.name}
                          {m.is_head_of_family && (
                            <span className="ml-1.5 inline-flex items-center text-[10px] text-emerald-800 bg-emerald-100 px-1 rounded">
                              Head
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
                Remove Record
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
