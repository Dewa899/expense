"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DashboardView } from "@/components/dashboard-view";
import { AppLayoutWrapper } from "@/components/app-layout-wrapper";

export function Logo({ 
  className = "", 
  onClick 
}: { 
  className?: string;
  onClick: () => void;
}) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-1 leading-none text-left hover:opacity-80 transition-opacity cursor-pointer ${className}`}
    >
      <div className="flex flex-col">
        <div className="flex items-baseline">
          <span className="text-xl font-black tracking-tighter text-emerald-500 italic">EXP</span>
          <span className="text-xs font-bold tracking-tight text-emerald-600/70 dark:text-emerald-400/50 -ml-0.5">ense</span>
        </div>
        <span className="text-[8px] font-light tracking-[0.2em] uppercase text-zinc-500 dark:text-zinc-500 ml-0.5">by GENLORD</span>
      </div>
    </button>
  );
}

export default function HomePage() {
  const router = useRouter();

  return (
    <AppLayoutWrapper>
      <DashboardView 
        onLoginClick={() => router.push("/login")}
      />
    </AppLayoutWrapper>
  );
}
