'use client';

import React, { useEffect, useState } from 'react';
import { DataService, ProfileUpdateRequest } from '@/lib/data-service';
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
  Pencil,
  Clock,
  ArrowRight,
  ShieldAlert,
  Check,
} from 'lucide-react';

export default function ProfileVerificationHub() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'registrations' | 'updates'>('registrations');
  const [pendingHouses, setPendingHouses] = useState<HouseWithDetails[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<ProfileUpdateRequest[]>([]);

  // Registration audit drawer & rejection
  const [selectedHouse, setSelectedHouse] = useState<HouseWithDetails | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [houseToReject, setHouseToReject] = useState<HouseWithDetails | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  // Profile Edit Update Audit
  const [selectedUpdate, setSelectedUpdate] = useState<ProfileUpdateRequest | null>(null);
  const [updateReviewModalOpen, setUpdateReviewModalOpen] = useState(false);
  const [approvingUpdateId, setApprovingUpdateId] = useState<string | null>(null);
  const [updateToReject, setUpdateToReject] = useState<ProfileUpdateRequest | null>(null);
  const [rejectUpdateModalOpen, setRejectUpdateModalOpen] = useState(false);
  const [updateRejectionReason, setUpdateRejectionReason] = useState('');
  const [isRejectingUpdate, setIsRejectingUpdate] = useState(false);

  const loadPending = async () => {
    try {
      const [houses, updates] = await Promise.all([
        DataService.getPendingProfilesAsync(),
        DataService.getPendingProfileUpdatesAsync(),
      ]);
      setPendingHouses(houses);
      setPendingUpdates(updates);
    } catch (err) {
      console.warn('loadPending error:', err);
    }
  };

  useEffect(() => {
    loadPending();
    // High-frequency realtime sync polling every 3 seconds
    const interval = setInterval(() => {
      loadPending();
    }, 3000);

    window.addEventListener('mahallu_data_updated', loadPending);
    return () => {
      clearInterval(interval);
      window.removeEventListener('mahallu_data_updated', loadPending);
    };
  }, []);

  // Handlers for Registration
  const handleOpenDrawer = (house: HouseWithDetails) => {
    setSelectedHouse(house);
    setDrawerOpen(true);
  };

  const handleApproveRegistration = async (houseId: string) => {
    setApprovingId(houseId);
    try {
      const success = await DataService.approveProfile(houseId);
      if (success) {
        toast('Household profile approved successfully! Portal access unlocked.', 'success');
        setDrawerOpen(false);
        await loadPending();
      } else {
        toast('Failed to approve profile. Please try again.', 'error');
      }
    } catch (err: any) {
      toast(err?.message || 'Failed to approve profile', 'error');
    } finally {
      setApprovingId(null);
    }
  };

  const handleOpenRejectRegistration = (house: HouseWithDetails) => {
    setHouseToReject(house);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmRejectRegistration = async (e: React.FormEvent) => {
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
        await loadPending();
      } else {
        toast('Failed to reject profile', 'error');
      }
    } catch (err: any) {
      toast(err?.message || 'Failed to reject profile', 'error');
    } finally {
      setIsRejecting(false);
    }
  };

  // Handlers for Profile Edit Requests
  const handleOpenReviewUpdate = (update: ProfileUpdateRequest) => {
    setSelectedUpdate(update);
    setUpdateReviewModalOpen(true);
  };

  const handleApproveUpdate = async (update: ProfileUpdateRequest) => {
    setApprovingUpdateId(update.id);
    try {
      await DataService.approveProfileUpdateAsync(update.id);
      const memberMsg =
        update.requested_members && update.requested_members.length > 0
          ? ` and updated ${update.requested_members.length} family census records`
          : '';
      toast(
        `Approved dwelling updates for ${update.requested_details.house_name}${memberMsg}! Records are now officially updated.`,
        'success'
      );
      setUpdateReviewModalOpen(false);
      setSelectedUpdate(null);
      await loadPending();
    } catch (err: any) {
      toast(err?.message || 'Failed to approve update', 'error');
    } finally {
      setApprovingUpdateId(null);
    }
  };

  const handleOpenRejectUpdate = (update: ProfileUpdateRequest) => {
    setUpdateToReject(update);
    setUpdateRejectionReason('');
    setRejectUpdateModalOpen(true);
  };

  const handleConfirmRejectUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateToReject) return;
    if (!updateRejectionReason.trim()) {
      toast('Please provide an explanation for rejecting these edits', 'error');
      return;
    }

    setIsRejectingUpdate(true);
    try {
      await DataService.rejectProfileUpdateAsync(updateToReject.id, updateRejectionReason.trim());
      toast('Profile update request rejected.', 'info');
      setRejectUpdateModalOpen(false);
      setUpdateReviewModalOpen(false);
      setUpdateToReject(null);
      await loadPending();
    } catch (err: any) {
      toast(err?.message || 'Failed to reject update', 'error');
    } finally {
      setIsRejectingUpdate(false);
    }
  };

  const totalPending = pendingHouses.length + pendingUpdates.length;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Profile Verification Hub
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
              {totalPending} Total Pending
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Audit new resident registration applications and verify requested dwelling & contact record updates.
          </p>
        </div>


      </div>

      {/* Verification Navigation Tabs */}
      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('registrations')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeTab === 'registrations'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>New Registrations</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'registrations'
                ? 'bg-emerald-100 text-emerald-900'
                : 'bg-slate-100 text-slate-600'
              }`}
          >
            {pendingHouses.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('updates')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeTab === 'updates'
              ? 'border-emerald-700 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <Pencil className="h-4 w-4" />
          <span>Dwelling &amp; Contact Edit Requests</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'updates'
                ? 'bg-emerald-100 text-emerald-900'
                : 'bg-slate-100 text-slate-600'
              }`}
          >
            {pendingUpdates.length}
          </span>
        </button>
      </div>

      {/* Tab 1: New Onboarding Registrations */}
      {activeTab === 'registrations' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
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
                    const head =
                      house.family_members.find((m) => m.is_head_of_family) ||
                      house.family_members[0];
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
                              className="gap-1 text-slate-700 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5 text-slate-500" />
                              View Details
                            </Button>

                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleApproveRegistration(house.id)}
                              isLoading={approvingId === house.id}
                              disabled={approvingId !== null}
                              className="gap-1 bg-emerald-700 hover:bg-emerald-800 cursor-pointer"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Approve
                            </Button>

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleOpenRejectRegistration(house)}
                              className="gap-1 cursor-pointer"
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

          {/* Mobile Cards View */}
          <div className="md:hidden divide-y divide-slate-100">
            {pendingHouses.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-slate-800">All Registrations Verified</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No pending registration requests.</p>
              </div>
            ) : (
              pendingHouses.map((house) => {
                const head =
                  house.family_members.find((m) => m.is_head_of_family) ||
                  house.family_members[0];
                return (
                  <div key={house.id} className="p-4 space-y-3 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{house.house_name}</h3>
                        <p className="text-xs font-mono text-emerald-800 font-bold mt-0.5">
                          {house.mahallu_reg_no}
                          <span className="font-sans font-normal text-slate-400 ml-1">
                            • Ward {house.house_number}
                          </span>
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                        Pending
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/90 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-medium">Head of Family</span>
                        <span className="font-semibold text-slate-800">{head?.name || '—'}</span>
                        {house.phone && (
                          <a
                            href={`tel:${house.phone}`}
                            className="text-[11px] text-emerald-700 hover:underline flex items-center gap-1 font-mono mt-0.5"
                          >
                            <Phone className="h-3 w-3" />
                            {house.phone}
                          </a>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-medium">Division &amp; Census</span>
                        <span className="font-medium text-slate-700 block">
                          {DIVISION_LABELS[house.division as Division]}
                        </span>
                        <span className="text-[11px] text-slate-500 font-semibold">
                          {house.family_members.length} member(s)
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Submitted: {formatDateTime(house.created_at)}
                    </div>

                    {/* Action Buttons: 3-column responsive touch grid */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDrawer(house)}
                        className="w-full justify-center gap-1 text-xs min-h-[40px] px-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span className="truncate">Details</span>
                      </Button>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleApproveRegistration(house.id)}
                        isLoading={approvingId === house.id}
                        disabled={approvingId !== null}
                        className="w-full justify-center gap-1 text-xs min-h-[40px] bg-emerald-700 hover:bg-emerald-800 px-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="truncate">Approve</span>
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleOpenRejectRegistration(house)}
                        className="w-full justify-center gap-1 text-xs min-h-[40px] px-1"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span className="truncate">Reject</span>
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Profile & Dwelling Edit Requests */}
      {activeTab === 'updates' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-6">Household &amp; Reg No</th>
                  <th className="py-3.5 px-4">Requested Modifications</th>
                  <th className="py-3.5 px-4">Submitted Contact</th>
                  <th className="py-3.5 px-4">Submitted Date</th>
                  <th className="py-3.5 px-6 text-right">Verification Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingUpdates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                          All Profile Edit Requests Verified
                        </p>
                        <p className="text-xs text-slate-400">
                          There are currently no dwelling record update requests pending verification.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pendingUpdates.map((update) => {
                    const changes: string[] = [];
                    if (update.requested_details.house_name !== update.current_details.house_name)
                      changes.push('House Name');
                    if (update.requested_details.house_number !== update.current_details.house_number)
                      changes.push('Ward / Door No');
                    if (update.requested_details.phone !== update.current_details.phone)
                      changes.push('Phone');
                    if (update.requested_details.division !== update.current_details.division)
                      changes.push('Division');

                    const curCount = update.current_members?.length || 0;
                    const reqCount = update.requested_members?.length || 0;
                    const hasMemberChanges =
                      Boolean(update.requested_members && update.requested_members.length > 0) &&
                      (curCount !== reqCount ||
                        JSON.stringify(update.requested_members) !==
                        JSON.stringify(update.current_members));

                    if (hasMemberChanges) {
                      changes.push(
                        `Census (${curCount !== reqCount ? `${curCount}→${reqCount}` : `${reqCount} members`})`
                      );
                    }

                    return (
                      <tr key={update.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="font-bold text-slate-900">
                            {update.requested_details.house_name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {update.mahallu_reg_no}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {changes.map((c) => (
                              <span
                                key={c}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${c.startsWith('Census')
                                    ? 'bg-purple-100 text-purple-900 border-purple-200'
                                    : 'bg-amber-100 text-amber-900 border-amber-200'
                                  }`}
                              >
                                {c}
                              </span>
                            ))}
                            {changes.length === 0 && (
                              <span className="text-slate-400 text-[11px]">No field changes</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">
                            {update.requested_details.phone}
                          </div>
                          {update.note && (
                            <div className="text-[11px] text-slate-500 truncate max-w-xs" title={update.note}>
                              Note: {update.note}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-500">
                          {formatDateTime(update.submitted_at)}
                        </td>

                        <td className="py-3.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenReviewUpdate(update)}
                              className="gap-1 text-slate-700 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5 text-slate-500" />
                              Review Changes
                            </Button>

                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleApproveUpdate(update)}
                              isLoading={approvingUpdateId === update.id}
                              disabled={approvingUpdateId !== null}
                              className="gap-1 bg-emerald-700 hover:bg-emerald-800 cursor-pointer"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Approve
                            </Button>

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleOpenRejectUpdate(update)}
                              className="gap-1 cursor-pointer"
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

          {/* Mobile Cards View */}
          <div className="md:hidden divide-y divide-slate-100">
            {pendingUpdates.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-slate-800">All Updates Verified</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No dwelling update requests pending review.</p>
              </div>
            ) : (
              pendingUpdates.map((update) => {
                const changes: string[] = [];
                if (update.requested_details.house_name !== update.current_details.house_name)
                  changes.push('House Name');
                if (update.requested_details.house_number !== update.current_details.house_number)
                  changes.push('Ward / Door No');
                if (update.requested_details.phone !== update.current_details.phone)
                  changes.push('Phone');
                if (update.requested_details.division !== update.current_details.division)
                  changes.push('Division');

                const curCount = update.current_members?.length || 0;
                const reqCount = update.requested_members?.length || 0;
                const hasMemberChanges =
                  Boolean(update.requested_members && update.requested_members.length > 0) &&
                  (curCount !== reqCount ||
                    JSON.stringify(update.requested_members) !==
                    JSON.stringify(update.current_members));

                if (hasMemberChanges) {
                  changes.push(
                    `Census (${curCount !== reqCount ? `${curCount}→${reqCount}` : `${reqCount} members`})`
                  );
                }

                return (
                  <div key={update.id} className="p-4 space-y-3 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">
                          {update.requested_details.house_name}
                        </h3>
                        <p className="text-xs font-mono text-emerald-800 font-bold mt-0.5">
                          {update.mahallu_reg_no}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200 shrink-0">
                        Profile Update
                      </span>
                    </div>

                    {/* Requested Changes Tags */}
                    <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Changes Requested:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {changes.map((c) => (
                          <span
                            key={c}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${c.startsWith('Census')
                                ? 'bg-purple-100 text-purple-900 border-purple-200'
                                : 'bg-amber-100 text-amber-900 border-amber-200'
                              }`}
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                      {update.note && (
                        <p className="text-[11px] text-slate-600 pt-1 italic">
                          "{update.note}"
                        </p>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Submitted: {formatDateTime(update.submitted_at)}
                    </div>

                    {/* Mobile Action Buttons */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenReviewUpdate(update)}
                        className="w-full justify-center gap-1 text-xs min-h-[40px] px-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span className="truncate">Review</span>
                      </Button>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleApproveUpdate(update)}
                        isLoading={approvingUpdateId === update.id}
                        disabled={approvingUpdateId !== null}
                        className="w-full justify-center gap-1 text-xs min-h-[40px] bg-emerald-700 hover:bg-emerald-800 px-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="truncate">Approve</span>
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleOpenRejectUpdate(update)}
                        className="w-full justify-center gap-1 text-xs min-h-[40px] px-1"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span className="truncate">Reject</span>
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Review Profile Update Modal (Diff comparison) */}
      <Modal
        isOpen={updateReviewModalOpen}
        onClose={() => {
          if (!approvingUpdateId) setUpdateReviewModalOpen(false);
        }}
        title="Verify Household Profile & Census Updates"
        description="Review submitted dwelling updates and family census changes against existing official records before approving."
        maxWidth="4xl"
      >
        {selectedUpdate && (
          <div className="space-y-4 text-xs">
            {/* House Identity Header */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Mahallu Household Registration
                </span>
                <span className="font-mono font-bold text-sm text-emerald-800">
                  {selectedUpdate.mahallu_reg_no}
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                Submitted: <strong>{formatDateTime(selectedUpdate.submitted_at)}</strong>
              </span>
            </div>

            {/* Comparison Table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Field</th>
                    <th className="py-2.5 px-3">Current Record</th>
                    <th className="py-2.5 px-3">Requested Update</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* House Name */}
                  <tr
                    className={
                      selectedUpdate.requested_details.house_name !==
                        selectedUpdate.current_details.house_name
                        ? 'bg-emerald-50/40'
                        : ''
                    }
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-700">House Name</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {selectedUpdate.current_details.house_name || '—'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {selectedUpdate.requested_details.house_name}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {selectedUpdate.requested_details.house_name !==
                        selectedUpdate.current_details.house_name ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Modified
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Unchanged</span>
                      )}
                    </td>
                  </tr>

                  {/* Ward / Door Number */}
                  <tr
                    className={
                      selectedUpdate.requested_details.house_number !==
                        selectedUpdate.current_details.house_number
                        ? 'bg-emerald-50/40'
                        : ''
                    }
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-700">Ward / Door</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {selectedUpdate.current_details.house_number || '—'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {selectedUpdate.requested_details.house_number}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {selectedUpdate.requested_details.house_number !==
                        selectedUpdate.current_details.house_number ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Modified
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Unchanged</span>
                      )}
                    </td>
                  </tr>

                  {/* Phone */}
                  <tr
                    className={
                      selectedUpdate.requested_details.phone !==
                        selectedUpdate.current_details.phone
                        ? 'bg-emerald-50/40'
                        : ''
                    }
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-700">Contact Phone</td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">
                      {selectedUpdate.current_details.phone || '—'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 font-mono">
                      {selectedUpdate.requested_details.phone}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {selectedUpdate.requested_details.phone !==
                        selectedUpdate.current_details.phone ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Modified
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Unchanged</span>
                      )}
                    </td>
                  </tr>

                  {/* Division */}
                  <tr
                    className={
                      selectedUpdate.requested_details.division !==
                        selectedUpdate.current_details.division
                        ? 'bg-emerald-50/40'
                        : ''
                    }
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-700">Division / Ward</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {DIVISION_LABELS[selectedUpdate.current_details.division] ||
                        selectedUpdate.current_details.division}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {DIVISION_LABELS[selectedUpdate.requested_details.division] ||
                        selectedUpdate.requested_details.division}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {selectedUpdate.requested_details.division !==
                        selectedUpdate.current_details.division ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Modified
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Unchanged</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Resident's Note */}
            {selectedUpdate.note && (
              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-950 space-y-1">
                <span className="font-bold block text-[11px]">Explanation Note by Resident</span>
                <p className="text-[11px] leading-relaxed text-amber-900">{selectedUpdate.note}</p>
              </div>
            )}

            {/* Family Members Census Audit Section */}
            {selectedUpdate.requested_members && selectedUpdate.requested_members.length > 0 && (
              <div className="space-y-3 pt-2">
                {/* Section Header with Stats */}
                {(() => {
                  const currentList = selectedUpdate.current_members || [];
                  const requestedList = selectedUpdate.requested_members || [];
                  const reqIds = new Set(requestedList.map((m) => m.id));
                  const reqNames = new Set(requestedList.map((m) => m.name.trim().toLowerCase()));
                  const removed = currentList.filter(
                    (m) => !reqIds.has(m.id) && !reqNames.has(m.name.trim().toLowerCase())
                  );

                  let addedCount = 0;
                  let modifiedCount = 0;

                  requestedList.forEach((m) => {
                    const match = currentList.find(
                      (cm) => cm.id === m.id || cm.name.trim().toLowerCase() === m.name.trim().toLowerCase()
                    );
                    if (!match) {
                      addedCount++;
                    } else {
                      const hasChanged =
                        match.name.trim() !== m.name.trim() ||
                        Boolean(match.is_head_of_family) !== Boolean(m.is_head_of_family) ||
                        match.relationship !== m.relationship ||
                        match.marital_status !== m.marital_status ||
                        match.job_status !== m.job_status ||
                        match.general_education !== m.general_education ||
                        match.religious_education !== m.religious_education ||
                        Number(match.age ?? -1) !== Number(m.age ?? -1) ||
                        (match.phone || '').trim().replace(/\D/g, '') !==
                        (m.phone || '').trim().replace(/\D/g, '');
                      if (hasChanged) modifiedCount++;
                    }
                  });

                  return (
                    <>
                      <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-emerald-700" />
                          <h3 className="font-bold text-xs text-slate-900">
                            Family Members Census Audit
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-slate-500">
                            Current: <strong>{currentList.length}</strong> → Requested: <strong>{requestedList.length}</strong>
                          </span>
                          {addedCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              +{addedCount} Added
                            </span>
                          )}
                          {modifiedCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                              {modifiedCount} Modified
                            </span>
                          )}
                          {removed.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                              -{removed.length} Removed
                            </span>
                          )}
                        </div>
                      </div>

                      {removed.length > 0 && (
                        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-[11px] flex items-start gap-2">
                          <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Member(s) Removed from Household ({removed.length}): </span>
                            <span>{removed.map((m) => `${m.name} (${m.relationship})`).join(', ')}</span>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Requested Members Table */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto max-h-[38vh]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3">Name / Role</th>
                          <th className="py-2.5 px-3">Relationship</th>
                          <th className="py-2.5 px-3">Age</th>
                          <th className="py-2.5 px-3">Status / Occupation</th>
                          <th className="py-2.5 px-3">Education</th>
                          <th className="py-2.5 px-3">Contact Phone</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {selectedUpdate.requested_members.map((m, idx) => {
                          const existingMatch = (selectedUpdate.current_members || []).find(
                            (cm) =>
                              cm.id === m.id ||
                              cm.name.trim().toLowerCase() === m.name.trim().toLowerCase()
                          );
                          const isNew = !existingMatch;

                          const changedFields: string[] = [];
                          if (existingMatch) {
                            if (existingMatch.name.trim() !== m.name.trim()) changedFields.push('Name');
                            if (Boolean(existingMatch.is_head_of_family) !== Boolean(m.is_head_of_family))
                              changedFields.push('Head');
                            if (existingMatch.relationship !== m.relationship)
                              changedFields.push('Relationship');
                            if (existingMatch.marital_status !== m.marital_status)
                              changedFields.push('Marital Status');
                            if (existingMatch.job_status !== m.job_status) changedFields.push('Job');
                            if (existingMatch.general_education !== m.general_education)
                              changedFields.push('General Ed');
                            if (existingMatch.religious_education !== m.religious_education)
                              changedFields.push('Religious Ed');
                            const curAge = existingMatch.age ?? null;
                            const reqAge = m.age ?? null;
                            if (curAge !== reqAge) changedFields.push('Age');
                            const curPhone = (existingMatch.phone || '').trim().replace(/\D/g, '');
                            const reqPhone = (m.phone || '').trim().replace(/\D/g, '');
                            if (curPhone !== reqPhone) changedFields.push('Phone');
                          }

                          const isModified = Boolean(existingMatch && changedFields.length > 0);

                          return (
                            <tr
                              key={m.id || idx}
                              className={
                                isNew
                                  ? 'bg-emerald-50/40'
                                  : isModified
                                    ? 'bg-amber-50/40'
                                    : ''
                              }
                            >
                              <td className="py-2.5 px-3 font-semibold text-slate-900">
                                <div className="flex items-center gap-1.5">
                                  <span className={existingMatch && existingMatch.name.trim() !== m.name.trim() ? 'font-bold text-amber-950' : ''}>
                                    {m.name}
                                  </span>
                                  {m.is_head_of_family && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                      <Crown className="h-3 w-3 text-amber-600" />
                                      Head
                                    </span>
                                  )}
                                </div>
                                {existingMatch && existingMatch.name.trim() !== m.name.trim() && (
                                  <span className="text-[10px] text-slate-400 line-through block mt-0.5 font-normal">
                                    was: {existingMatch.name}
                                  </span>
                                )}
                              </td>

                              <td className="py-2.5 px-3 text-slate-700">
                                <span className={existingMatch && existingMatch.relationship !== m.relationship ? 'font-bold text-amber-950' : ''}>
                                  {m.relationship}
                                </span>
                                {existingMatch && existingMatch.relationship !== m.relationship && (
                                  <span className="text-[10px] text-slate-400 line-through block font-normal">
                                    was: {existingMatch.relationship}
                                  </span>
                                )}
                              </td>

                              <td className="py-2.5 px-3 text-slate-700">
                                <span className={existingMatch && existingMatch.age !== m.age ? 'font-bold text-amber-950' : ''}>
                                  {m.age ?? '—'}
                                </span>
                                {existingMatch && existingMatch.age !== m.age && (
                                  <span className="text-[10px] text-slate-400 line-through block font-normal">
                                    was: {existingMatch.age ?? '—'}
                                  </span>
                                )}
                              </td>

                              <td className="py-2.5 px-3 text-slate-700">
                                <div className="space-y-0.5">
                                  <div>
                                    <span className={`capitalize ${existingMatch && existingMatch.marital_status !== m.marital_status ? 'font-bold text-amber-950' : ''}`}>
                                      {m.marital_status}
                                    </span>
                                    {existingMatch && existingMatch.marital_status !== m.marital_status && (
                                      <span className="text-[10px] text-slate-400 line-through ml-1 font-normal">
                                        ({existingMatch.marital_status})
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <span className={`text-[10px] text-slate-600 block ${existingMatch && existingMatch.job_status !== m.job_status ? 'font-bold text-amber-950' : ''}`}>
                                      {m.job_status}
                                    </span>
                                    {existingMatch && existingMatch.job_status !== m.job_status && (
                                      <span className="text-[9px] text-slate-400 line-through block font-normal">
                                        was: {existingMatch.job_status}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="py-2.5 px-3 text-slate-700">
                                <div className="space-y-0.5">
                                  <div>
                                    <span className={existingMatch && existingMatch.general_education !== m.general_education ? 'font-bold text-amber-950' : ''}>
                                      {m.general_education}
                                    </span>
                                    {existingMatch && existingMatch.general_education !== m.general_education && (
                                      <span className="text-[10px] text-slate-400 line-through block font-normal">
                                        was: {existingMatch.general_education}
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <span className={`text-[10px] block ${existingMatch && existingMatch.religious_education !== m.religious_education ? 'font-bold text-emerald-900' : 'text-emerald-700'}`}>
                                      {m.religious_education}
                                    </span>
                                    {existingMatch && existingMatch.religious_education !== m.religious_education && (
                                      <span className="text-[9px] text-slate-400 line-through block font-normal">
                                        was: {existingMatch.religious_education}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="py-2.5 px-3 font-mono text-slate-600">
                                <span className={existingMatch && (existingMatch.phone || '') !== (m.phone || '') ? 'font-bold text-amber-950' : ''}>
                                  {m.phone || '—'}
                                </span>
                                {existingMatch && (existingMatch.phone || '') !== (m.phone || '') && (
                                  <span className="text-[10px] text-slate-400 line-through block font-normal">
                                    was: {existingMatch.phone || 'None'}
                                  </span>
                                )}
                              </td>

                              <td className="py-2.5 px-3 text-center">
                                {isNew ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    + Added
                                  </span>
                                ) : isModified ? (
                                  <div className="flex flex-col items-center">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                      Modified
                                    </span>
                                    <span
                                      className="text-[9px] text-amber-800 mt-0.5 max-w-[80px] truncate font-medium"
                                      title={changedFields.join(', ')}
                                    >
                                      {changedFields.join(', ')}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">Unchanged</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUpdateReviewModalOpen(false)}
                disabled={approvingUpdateId !== null}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => handleOpenRejectUpdate(selectedUpdate)}
                disabled={approvingUpdateId !== null}
                className="gap-1 cursor-pointer"
              >
                <XCircle className="h-4 w-4" />
                Reject Request
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => handleApproveUpdate(selectedUpdate)}
                isLoading={approvingUpdateId === selectedUpdate.id}
                disabled={approvingUpdateId !== null}
                className="gap-1.5 bg-emerald-700 hover:bg-emerald-800 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                Approve & Apply to Official Records
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Profile Update Reason Modal */}
      <Modal
        isOpen={rejectUpdateModalOpen}
        onClose={() => {
          if (!isRejectingUpdate) setRejectUpdateModalOpen(false);
        }}
        title="Reject Profile Update Request"
        description="Provide a reason explaining why the requested dwelling updates were rejected."
      >
        <form onSubmit={handleConfirmRejectUpdate} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Reason for Rejection *
            </label>
            <textarea
              rows={4}
              value={updateRejectionReason}
              onChange={(e) => setUpdateRejectionReason(e.target.value)}
              placeholder="e.g. Door number mismatch with official ward roster, contact number must belong to approved family member..."
              className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRejectUpdateModalOpen(false)}
              disabled={isRejectingUpdate}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              isLoading={isRejectingUpdate}
              disabled={isRejectingUpdate}
            >
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>

      {/* Household & Family Members Detail Modal Drawer for New Registration */}
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
                  <span className="text-slate-400 block">Registration No</span>
                  <span className="font-mono font-bold text-emerald-800">
                    {selectedHouse.mahallu_reg_no}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Division</span>
                  <span className="font-medium text-slate-700">
                    {DIVISION_LABELS[selectedHouse.division as Division]}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Contact Phone</span>
                  <span className="font-semibold text-slate-800">{selectedHouse.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Submission Date</span>
                  <span className="text-slate-700">
                    {formatDate(selectedHouse.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Family Members Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                  Census Roster ({selectedHouse.family_members.length} Members)
                </h3>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Name</th>
                      <th className="py-2.5 px-3">Relation</th>
                      <th className="py-2.5 px-3">Age</th>
                      <th className="py-2.5 px-3">Marital</th>
                      <th className="py-2.5 px-3">Job Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedHouse.family_members.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-1.5">
                            {m.name}
                            {m.is_head_of_family && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                <Crown className="h-3 w-3" />
                                Head
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{m.relationship}</td>
                        <td className="py-2.5 px-3 text-slate-600">{m.age ?? '—'}</td>
                        <td className="py-2.5 px-3 text-slate-600 capitalize">{m.marital_status}</td>
                        <td className="py-2.5 px-3 text-slate-600">{m.job_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <Button
                variant="destructive"
                onClick={() => handleOpenRejectRegistration(selectedHouse)}
                className="gap-1.5"
              >
                <XCircle className="h-4 w-4" />
                Reject Profile
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setDrawerOpen(false)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleApproveRegistration(selectedHouse.id)}
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

      {/* Reject with Reason Modal for New Registration */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Household Registration"
        description="Provide a clear explanation note returned to the applicant."
      >
        <form onSubmit={handleConfirmRejectRegistration} className="space-y-4 text-xs">
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
