'use client';
import { useEffect, useState } from 'react';
import { TEAMS } from '@/lib/store';

export default function SettingsPage() {
  const [team, setTeam] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('vp_team') || '';
    setTeam(t);
  }, []);

  const teamInfo = TEAMS[team];

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>설정</h1>
        <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>팀 정보</p>
      </div>

      <div style={{
        background: '#1e293b', borderRadius: '12px', padding: '28px',
        border: '1px solid #334155', maxWidth: '480px',
      }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '8px' }}>팀 코드</div>
          <div style={{ color: 'white', fontSize: '28px', fontWeight: 800 }}>{team}</div>
        </div>
        <div>
          <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '8px' }}>팀 이름</div>
          <div style={{ color: 'white', fontSize: '18px', fontWeight: 600 }}>{teamInfo?.name}</div>
        </div>
      </div>

      <div style={{
        marginTop: '16px',
        background: '#f59e0b10', border: '1px solid #f59e0b40',
        borderRadius: '10px', padding: '14px 16px', maxWidth: '480px',
      }}>
        <div style={{ color: '#f59e0b', fontSize: '13px' }}>
          ⚠️ 팀 코드는 입장 시 사용하는 키입니다. 공유 시 주의하세요.
        </div>
      </div>
    </div>
  );
}
