'use client';

import { useAuth } from '@/lib/auth-context';
import PatientDashboard from '@/components/dashboard/patient-dashboard';
import CounselorDashboard from '@/components/dashboard/counselor-dashboard';
import AdminDashboard from '@/components/dashboard/admin-dashboard';

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  // Route to appropriate dashboard based on role
  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'counselor':
      return <CounselorDashboard />;
    case 'researcher':
      // Researcher can use counselor dashboard with research features
      return <CounselorDashboard />;
    default:
      return <PatientDashboard />;
  }
}
