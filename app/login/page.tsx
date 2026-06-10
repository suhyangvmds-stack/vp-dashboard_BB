'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TEAMS } from '@/lib/store';

export default function LoginPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = () => {
    const upper = code.toUpperCase().trim();
    if (TEAMS[upper]) {
      localStorage.setItem('vp_team', upper);
      router.push('/dashboard');
    } else {
      setError('올바른 팀 코드를 입력하세요.');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: '#1e293b',
        borderRadius: '16px',
        padding: '48px',
        width: '360px',
        textAlign: 'center',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
      }}>
        <div style={{
          width: '60px', height: '60px',
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          borderRadius: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '24px', fontWeight: 800, color: 'white',
        }}>VP</div>

        <h1 style={{ color: 'white', fontSize: '22px', fontWeight: 700, margin: '0 0 6px' }}>
          VP 판매 모니터링
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 32px' }}>
          팀 코드를 입력하세요
        </p>

        <input
          value={code}
          onChange={e => { setCode(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="예: BB, BD"
          style={{
            width: '100%',
            padding: '14px 16px',
            background: '#0f172a',
            border: error ? '1px solid #ef4444' : '1px solid #334155',
            borderRadius: '10px',
            color: 'white',
            fontSize: '18px',
            fontWeight: 700,
            textAlign: 'center',
            letterSpacing: '4px',
            textTransform: 'uppercase',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {error && <p style={{ color: '#ef4444', fontSize: '13px', margin: '8px 0 0' }}>{error}</p>}

        <button
          onClick={handleLogin}
          style={{
            width: '100%',
            padding: '14px',
            marginTop: '16px',
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            border: 'none',
            borderRadius: '10px',
            color: 'white',
            fontSize: '16px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          입장
        </button>

        <p style={{ color: '#475569', fontSize: '12px', marginTop: '24px' }}>
          BB = 블루독베이비 &nbsp;·&nbsp; BD = 블루독
        </p>
      </div>
    </div>
  );
}
