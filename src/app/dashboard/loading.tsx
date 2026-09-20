import React from 'react';
import { LoadingScreen } from '@/components/ui/LoadingAnimation';

export default function DashboardLoading() {
  return (
    <LoadingScreen
      title="റെസിഡന്റ് പോർട്ടൽ"
      message="കുടുംബ വിവരങ്ങളും വരിസംഖ്യയും ലോഡ് ചെയ്യുന്നു..."
      minHeight="min-h-[70vh]"
    />
  );
}
