'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const team = localStorage.getItem('vp_team');
    if (!team) router.push('/login');
  }, [router]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a' }}>
      <Sidebar />
      <main style={{ marginLeft: '200px', flex: 1, padding: '32px', color: 'white' }}>
        {children}
      </main>
    </div>
  );
}
