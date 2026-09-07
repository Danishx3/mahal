import React from 'react';
import { LoadingScreen } from '@/components/ui/LoadingAnimation';

export default function Loading() {
  return (
    <LoadingScreen
      title="Mahallu Jama'ath"
      message="Loading village management portal..."
      minHeight="min-h-[75vh]"
    />
  );
}
