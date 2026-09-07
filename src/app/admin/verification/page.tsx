'use client';

import React, { useEffect, useState } from 'react';
import { DataService } from '@/lib/data-service';
import { HouseWithDetails, DIVISION_LABELS, Division } from '@/lib/supabase/types';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  Eye,
  Home,
  Users,
  MapPin,
  Phone,
  AlertCircle,
  Crown,
  Briefcase,
  GraduationCap,
  BookOpen,
} from 'lucide-react';

export default function ProfileVerificationHub() {
  const { toast } = useToast();
  const [pendingHouses, setPendingHouses] = useState<HouseWithDetails[]>([]);
  const [selectedHouse, setSelectedHouse] = useState<HouseWithDetails | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Reject modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [houseToReject, setHouseToReject] = useState<HouseWithDetails | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  const loadPending = async () => {
    await DataService.syncHousesFromSupabase();
    const list = DataService.getPendingProfiles();
    setPendingHouses(list);
  };

  useEffect(() => {
    loadPending();
    window.addEventListener('mahallu_data_updated', loadPending);
    return () => window.removeEventListener('mahallu_data_updated', loadPending);
  }, []);

  const handleOpenDrawer = (house: HouseWithDetails) => {
    setSelectedHouse(house);
    setDrawerOpen(true);
  };

  const handleApprove = async (houseId: string) => {
    setApprovingId(houseId);
    try {
      const success = await DataService.approveProfile(houseId);
      if (success) {
        toast('Household profile approved successfully! Portal access unlocked.', 'success');
        setDrawerOpen(false);
        const list = DataService.getPendingProfiles();
        setPendingHouses(list);
      } else {
        toast('Failed to approve profile. Please try again.', 'error');
      }
    } catch (err: any) {
      toast(err?.message || 'Failed to approve profile', 'error');
    } finally {
      setApprovingId(null);
    }
  };

  const handleOpenReject = (house: HouseWithDetails) => {
    setHouseToReject(house);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseToReject) return;

    if (!rejectionReason.trim()) {
      toast('Please provide a reason for rejecting this profile', 'error');
      return;
    }

    setIsRejecting(true);
    try {
      const success = await DataService.rejectProfile(houseToReject.id, rejectionReason.trim());
      if (success) {
        toast('Profile rejected with explanation returned to applicant.', 'info');
        setRejectModalOpen(false);
        setDrawerOpen(false);
        const list = DataService.getPendingProfiles();
        setPendingHouses(list);
      } else {
        toast('Failed to reject profile', 'error');
      }
    } catch (err: any) {
      toast(err?.message || 'Failed to reject profile', 'error');
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Profile Verification Hub
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
              {pendingHouses.length} Pending
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Review new resident onboarding applications, verify family member rosters, and unlock portal privileges.
          </p>
        </div>
      </div>

      {/* Main Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-6">Household / Reg No</th>
                <th className="py-3.5 px-4">Head of Family</th>
                <th className="py-3.5 px-4">Division</th>
                <th className="py-3.5 px-4">Members</th>
                <th className="py-3.5 px-4">Submitted At</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingHouses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        All Household Profiles Verified
                      </p>
                      <p className="text-xs text-slate-400">
                        There are currently no new registration requests in the review queue.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pendingHouses.map((house) => {
                  const head = house.family_members.find((m) => m.is_head_of_family) || house.family_members[0];
                  return (
                    <tr key={house.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-slate-900">{house.house_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {house.mahallu_reg_no} • Ward: {house.house_number}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{head?.name || '—'}</div>
                        <div className="text-[11px] text-slate-500">{house.phone}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {DIVISION_LABELS[house.division as Division]}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          {house.family_members.length} members
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {formatDateTime(house.created_at)}
                      </td>

                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDrawer(house)}
                            className="gap-1 text-slate-700"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-500" />
                            View Details
                          </Button>

                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApprove(house.id)}
                            isLoading={approvingId === house.id}
                            disabled={approvingId !== null}
                            className="gap-1 bg-emerald-700 hover:bg-emerald-800"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approve
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleOpenReject(house)}
                            className="gap-1"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Household & Family Members Detail Modal Drawer */}
      <Modal
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Household Registration Audit"
        description="Verify submitted address details and family members census before granting approval."
        maxWidth="2xl"
      >
        {selectedHouse && (
          <div className="space-y-6 text-xs">
            {/* House Details Grid */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h3 className="font-bold uppercase tracking-wider text-slate-400 text-[10px] mb-3">
                Household Information
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-slate-400 block">House Name</span>
                  <span className="font-bold text-slate-900">{selectedHouse.house_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">House / Ward No</span>
                  <span className="font-semibold text-slate-800">{selectedHouse.house_number}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Mahallu Reg No</span>
                  <span className="font-mono font-bold text-emerald-800">
                    {selectedHouse.mahallu_reg_no}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Division</span>
                  <span className="font-semibold text-slate-800">
                    {DIVISION_LABELS[selectedHouse.division as Division]}
                  </span>
                </div>
              </div>
            </div>

            {/* Family Members Roster */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                  Census Records ({selectedHouse.family_members.length} Members)
                </h3>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">Relation</th>
                      <th className="p-2.5">Age</th>
                      <th className="p-2.5">Marital Status</th>
                      <th className="p-2.5">Occupation</th>
                      <th className="p-2.5">General Edu</th>
                      <th className="p-2.5">Religious Edu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedHouse.family_members.map((m) => (
                      <tr key={m.id} className={m.is_head_of_family ? 'bg-emerald-50/30' : ''}>
                        <td className="p-2.5">
                          <span className="font-bold text-slate-900 block">{m.name}</span>
                          {m.is_head_of_family && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 font-bold bg-emerald-100 px-1.5 rounded">
                              <Crown className="h-2.5 w-2.5 text-amber-500" />
                              Head of Family
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-700">{m.relationship}</td>
                        <td className="p-2.5 text-slate-700">{m.age ?? '—'}</td>
                        <td className="p-2.5 text-slate-700 capitalize">{m.marital_status}</td>
                        <td className="p-2.5 text-slate-700">{m.job_status}</td>
                        <td className="p-2.5 text-slate-700">{m.general_education}</td>
                        <td className="p-2.5 text-slate-700">{m.religious_education}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <Button
                variant="destructive"
                onClick={() => {
                  setDrawerOpen(false);
                  handleOpenReject(selectedHouse);
                }}
                className="gap-1.5"
              >
                <XCircle className="h-4 w-4" />
                Reject Application
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setDrawerOpen(false)} disabled={approvingId !== null}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleApprove(selectedHouse.id)}
                  isLoading={approvingId === selectedHouse.id}
                  disabled={approvingId !== null}
                  className="gap-1.5 bg-emerald-700 hover:bg-emerald-800"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve Profile
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject with Reason Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Household Registration"
        description="Provide a clear explanation note returned to the applicant."
      >
        <form onSubmit={handleConfirmReject} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Reason for Rejection *
            </label>
            <textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Incomplete family records, duplicate registration number, or verification required by ward member..."
              className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectModalOpen(false)}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" isLoading={isRejecting} disabled={isRejecting}>
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
