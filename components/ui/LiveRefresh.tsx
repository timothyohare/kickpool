'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  isLive: boolean;
  intervalSeconds?: number;
}

export default function LiveRefresh({ isLive, intervalSeconds = 30 }: Props) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isLive) return;

    timerRef.current = setInterval(() => {
      router.refresh();
    }, intervalSeconds * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLive, intervalSeconds, router]);

  if (!isLive) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-green-700 font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      LIVE · auto-updates every {intervalSeconds}s
    </div>
  );
}
