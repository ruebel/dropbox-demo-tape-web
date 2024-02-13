"use client";

import { Auth } from "@/components/Auth/Auth";
import { Suspense } from "react";

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <Auth />
    </Suspense>
  );
}
