'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const team = localStorage.getItem('vp_team');
    if (team) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);
  return null;
}
