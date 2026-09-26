"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { SiteProvider } from "@/contexts/SiteContext";
import Header from "@/components/Header";
import TabNav from "@/components/TabNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <SiteProvider>
      <div className="flex min-h-screen flex-1 flex-col">
        <Header />
        <TabNav />
        <main className="flex-1 px-4 py-5 sm:px-6">{children}</main>
      </div>
    </SiteProvider>
  );
}
