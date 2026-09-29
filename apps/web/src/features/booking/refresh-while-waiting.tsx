"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// "Oczekujemy na potwierdzenie płatności": asks the server again every few
// seconds until the payment (BLIK, Przelewy24) is settled.
export function RefreshWhileWaiting({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), seconds * 1000);
    return () => window.clearInterval(timer);
  }, [router, seconds]);
  return null;
}
