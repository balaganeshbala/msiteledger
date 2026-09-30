import { Navigate, Route, Routes } from "react-router";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import OfflineOverlay from "@/components/OfflineOverlay";
import AppLayout from "@/layouts/AppLayout";
import SiteLayout from "@/layouts/SiteLayout";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import SitesPage from "@/pages/SitesPage";
import LabourPage from "@/pages/LabourPage";
import DirectoryPage from "@/pages/DirectoryPage";
import SiteOverviewPage from "@/pages/site/SiteOverviewPage";
import SiteExpensesPage from "@/pages/site/SiteExpensesPage";
import SiteReceiptsPage from "@/pages/site/SiteReceiptsPage";
import SiteLabourPage from "@/pages/site/SiteLabourPage";

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />

            {/* Auth-gated: AppLayout redirects to /login when signed out. */}
            <Route element={<AppLayout />}>
              <Route path="sites" element={<SitesPage />} />
              <Route path="labour" element={<LabourPage />} />
              <Route path="directory" element={<DirectoryPage />} />
              <Route path="site" element={<SiteLayout />}>
                <Route index element={<SiteOverviewPage />} />
                <Route path="expenses" element={<SiteExpensesPage />} />
                <Route path="receipts" element={<SiteReceiptsPage />} />
                <Route path="labour" element={<SiteLabourPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
        <OfflineOverlay />
      </LanguageProvider>
    </ThemeProvider>
  );
}
