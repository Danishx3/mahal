'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export function TopProgressBar() {
  const pathname = usePathname();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Trigger progress bar briefly when pathname changes
    setIsAnimating(true);
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 450);

    return () => clearTimeout(timer);
  }, [pathname]);

  if (!isAnimating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none h-1 bg-transparent overflow-hidden">
      <div className="h-full w-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-300 animate-shimmer-slide shadow-sm shadow-emerald-500/50" />
    </div>
  );
}
