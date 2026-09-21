import React from 'react';
import { LoadingScreen } from '@/components/ui/LoadingAnimation';

export default function Loading() {
  return (
    <LoadingScreen
      title="മഹല്ല്"
      message="പോർട്ടൽ ലോഡ് ചെയ്യുന്നു..."
      minHeight="min-h-[75vh]"
    />
  );
}
