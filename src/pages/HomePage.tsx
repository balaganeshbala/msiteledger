import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    navigate(user ? "/sites" : "/login", { replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-sm text-slate-500">Loading...</p>
    </div>
  );
}
