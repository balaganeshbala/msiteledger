import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router";
import { useAuth } from "@/contexts/AuthContext";
import { SiteProvider } from "@/contexts/SiteContext";
import Header from "@/components/Header";
import TabNav from "@/components/TabNav";

export default function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, loading, navigate]);

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
        <main className="flex-1 px-4 py-5 sm:px-6">
          <Outlet />
        </main>
      </div>
    </SiteProvider>
  );
}
