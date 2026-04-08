import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import StaffGuard from './components/StaffGuard';
import { VoiceProvider } from '@/lib/VoiceContext';

// Staff (protected) pages
import StaffDashboard from './pages/StaffDashboard';
import PatientList from './pages/PatientList';

// Public pages
import RegisterPatient from './pages/RegisterPatient.js';
import PatientView from './pages/PatientView';
import MisTrayectos from './pages/MisTrayectos';
import AdminLogin from './pages/AdminLogin';
import VoiceRegistrationFlow from './components/accessibility/VoiceRegistrationFlow';

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <VoiceProvider>
        <Router>
          <Routes>
            {/* ── Landing: redirect / to register ── */}
            <Route path="/" element={<Navigate to="/register" replace />} />

            {/* ── Public patient routes ── */}
            <Route path="/register" element={<RegisterPatient />} />
            <Route path="/voice-register" element={<VoiceRegistrationFlow />} />
            <Route path="/patient/view" element={<PatientView />} />
            <Route path="/mis-trayectos" element={<MisTrayectos />} />

            {/* ── Hidden admin login (requires ?key=sdnexus2026) ── */}
            <Route path="/admin-login" element={<AdminLogin />} />

            {/* ── Protected staff routes ── */}
            <Route element={<StaffGuard />}>
              <Route path="/staff" element={<StaffDashboard />} />
              <Route path="/patients" element={<PatientList />} />
            </Route>

            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
        </VoiceProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;