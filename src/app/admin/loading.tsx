import React from 'react';
import { LoadingScreen } from '@/components/ui/LoadingAnimation';

export default function AdminLoading() {
  return (
    <LoadingScreen
      title="മഹല്ല് അഡ്മിനിസ്ട്രേഷൻ"
      message="അഡ്മിൻ കൺസോൾ ലോഡ് ചെയ്യുന്നു..."
      minHeight="min-h-[70vh]"
    />
  );
}
