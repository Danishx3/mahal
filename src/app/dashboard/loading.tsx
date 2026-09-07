import React from 'react';
import { LoadingScreen } from '@/components/ui/LoadingAnimation';

export default function DashboardLoading() {
  return (
    <LoadingScreen
      title="Resident Portal"
      message="Synchronizing household records, dues & receipts..."
      minHeight="min-h-[70vh]"
    />
  );
}
