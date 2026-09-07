import React from 'react';
import { LoadingScreen } from '@/components/ui/LoadingAnimation';

export default function AdminLoading() {
  return (
    <LoadingScreen
      title="Mahallu Administration"
      message="Securing session & loading administrative console..."
      minHeight="min-h-[70vh]"
    />
  );
}
