"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useSites } from "@/hooks/useSites";
import type { Site } from "@/types";

interface SiteContextValue {
  sites: Site[];
  loading: boolean;
  addSite: (siteName: string, clientName: string) => Promise<void>;
  updateSite: ReturnType<typeof useSites>["updateSite"];
  removeSite: ReturnType<typeof useSites>["removeSite"];
}

const SiteContext = createContext<SiteContextValue | undefined>(undefined);

export function SiteProvider({ children }: { children: ReactNode }) {
  const { sites, loading, addSite, updateSite, removeSite } = useSites();

  return (
    <SiteContext.Provider
      value={{
        sites,
        loading,
        addSite,
        updateSite,
        removeSite,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}

export function useSiteContext() {
  const ctx = useContext(SiteContext);
  if (!ctx) {
    throw new Error("useSiteContext must be used within a SiteProvider");
  }
  return ctx;
}
