'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DataService } from '@/lib/data-service';
import { HouseWithDetails, DIVISION_LABELS } from '@/lib/supabase/types';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  Home,
  Users,
  CreditCard,
  Phone,
  Hash,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Edit3,
  ExternalLink,
  Crown,
  Briefcase,
  GraduationCap,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';

export default function ResidentDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, house: authHouse, isLoading } = useAuth();
  const [house, setHouse] = useState<HouseWithDetails | null>(null);
  const [membersExpanded, setMembersExpanded] = useState(true);
  const [editRequestModalOpen, setEditRequestModalOpen] = useState(false);
  const [editNote, setEditNote] = useState('');

  const loadData = () => {
    if (!user) return;
    // Load house for current user
    let userHouse = authHouse?.id
      ? DataService.getHouseById(authHouse.id)
      : DataService.getHouseByUserId(user.id);

    // If still null, try finding any house registered by this user
    if (!userHouse) {
      userHouse = DataService.getHouses().find((h) => h.user_id === user.id);
    }

    setHouse(userHouse || null);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('mahallu_data_updated', loadData);
    return () => window.removeEventListener('mahallu_data_updated', loadData);
  }, [user, authHouse]);

  if (!house) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <p className="text-slate-500">No household profile found for this account.</p>
          <Button onClick={() => router.push('/onboarding')}>Complete Onboarding</Button>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const verifiedDues = house.payment_dues.filter((d) => d.status === 'verified');
  const paidTotal = verifiedDues.reduce((acc, d) => acc + Number(d.amount), 0);
  const pendingDues = house.payment_dues.filter(
    (d) => d.status === 'pending' || d.status === 'under_review'
  );
  const pendingAmount = pendingDues.reduce((acc, d) => acc + Number(d.amount), 0);
  const failedDuesCount = house.payment_dues.filter((d) => d.status === 'failed').length;

  const handleSendEditRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNote.trim()) return;
    toast('Update request forwarded to Mahallu Secretary for verification.', 'success');
    setEditRequestModalOpen(false);
    setEditNote('');
  };

  return (
    <div className="flex-1 bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {house.house_name}
              </h1>
              <Badge variant="approved">Verified Household</Badge>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <span>Mahallu Reg No: <strong className="text-emerald-800 font-mono">{house.mahallu_reg_no}</strong></span>
              <span>•</span>
              <span>Division: <strong className="text-slate-800">{DIVISION_LABELS[house.division]}</strong></span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard/payments">
              <Button variant="primary" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Pay Monthly Dues
              </Button>
            </Link>
          </div>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Pending Dues */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Pending / Due
              </span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-slate-900">
                {formatCurrency(pendingAmount)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {pendingDues.length} month(s) awaiting payment or review
              </p>
            </div>
          </div>

          {/* Paid Total */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total Dues Paid
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-emerald-800">
                {formatCurrency(paidTotal)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {verifiedDues.length} verified monthly contributions
              </p>
            </div>
          </div>

          {/* Household Strength */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Registered Members
              </span>
              <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-slate-900">
                {house.family_members.length} Members
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {house.family_members.filter((m) => m.job_status === 'Abroad').length} abroad (NRI) •{' '}
                {house.family_members.filter((m) => m.age !== null && m.age < 18).length} children
              </p>
            </div>
          </div>
        </div>

        {/* House Overview Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <Home className="h-4 w-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-slate-900">Dwelling & Contact Records</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditRequestModalOpen(true)}
              className="gap-1.5"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Request Edit
            </Button>
          </div>

          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Official House Name</span>
              <span className="font-bold text-sm text-slate-900">{house.house_name}</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Ward / Door Number</span>
              <span className="font-semibold text-slate-800">{house.house_number}</span>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Mahallu Registration Number</span>
              <span className="font-mono font-bold text-emerald-800 text-sm">
                {house.mahallu_reg_no}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Registered Phone</span>
              <span className="font-semibold text-slate-800">{house.phone}</span>
            </div>
          </div>
        </div>

        {/* Family Members Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <Users className="h-4 w-4 text-emerald-700" />
              <h2 className="text-sm font-bold text-slate-900">
                Family Members Census ({house.family_members.length})
              </h2>
            </div>
            <button
              onClick={() => setMembersExpanded(!membersExpanded)}
              className="text-slate-500 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {membersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {membersExpanded && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-6">Name</th>
                    <th className="py-3 px-4">Relationship</th>
                    <th className="py-3 px-4">Age</th>
                    <th className="py-3 px-4">Marital Status</th>
                    <th className="py-3 px-4">Occupation</th>
                    <th className="py-3 px-4">General Education</th>
                    <th className="py-3 px-4">Religious Education</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {house.family_members.map((member) => (
                    <tr
                      key={member.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        member.is_head_of_family ? 'bg-emerald-50/20 font-medium' : ''
                      }`}
                    >
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{member.name}</span>
                          {member.is_head_of_family && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              <Crown className="h-2.5 w-2.5 text-amber-500" />
                              Head
                            </span>
                          )}
                        </div>
                        {member.phone && (
                          <span className="text-[11px] text-slate-400 block mt-0.5 font-mono">
                            {member.phone}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">{member.relationship}</td>
                      <td className="py-3.5 px-4 text-slate-700">{member.age ?? '—'}</td>
                      <td className="py-3.5 px-4 text-slate-700 capitalize">{member.marital_status}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                          <Briefcase className="h-3 w-3 text-slate-400" />
                          {member.job_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-slate-700">
                          <GraduationCap className="h-3 w-3 text-slate-400" />
                          {member.general_education}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-slate-700">
                          <BookOpen className="h-3 w-3 text-emerald-600" />
                          {member.religious_education}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Request Modal */}
      <Modal
        isOpen={editRequestModalOpen}
        onClose={() => setEditRequestModalOpen(false)}
        title="Request Household Information Update"
        description="Notify the Mahallu Admin of changes to address, contact phone, or new family members."
      >
        <form onSubmit={handleSendEditRequest} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Describe the required updates or modifications
            </label>
            <textarea
              rows={4}
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="e.g. Addition of newborn child, change in employment status of son Mohammad Bilal to Abroad, or updated phone number..."
              className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditRequestModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Send Edit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
