"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function OperatorRoutePrefetcher({ hrefs }: { hrefs: string[] }) {
  const router = useRouter();

  useEffect(() => {
    hrefs.forEach((href) => {
      router.prefetch(href);
    });
  }, [hrefs, router]);

  return null;
}
