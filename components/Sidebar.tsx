'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { TEAMS } from '@/lib/store';

const MENUS = [
  { path: '/dashboard', label: '대시보드', icon: '📊' },
  { path: '/dashboard/items', label: 'VP 아이템', icon: '👔' },
  { path: '/dashboard/upload', label: '데이터 업로드', icon: '📤' },
  { path: '/dashboard/history', label: '연출 이력', icon: '🕐' },
  { path: '/dashboard/settings', label: '설정', icon: '⚙️' },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [team, setTeam] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('vp_team') || '';
    setTeam(t);
  }, []);

  const teamInfo = TEAMS[team];

  return (
    <aside style={{
      width: '200px',
      minHeight: '100vh',
      background: '#1e293b',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0, top: 0,
      borderRight: '1px solid #334155',
    }}>
      {/* 팀 정보 */}
      <div style={{ padding: '20px 16px', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 800, color: 'white',
          }}>{team}</div>
          <div>
            <div style={{ color: 'white', fontSize: '13px', fontWeight: 700 }}>
              {teamInfo?.name || team}
            </div>
            <div style={{ color: '#64748b', fontSize: '11px' }}>{team}</div>
          </div>
        </div>
      </div>

      {/* 메뉴 */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {MENUS.map(menu => {
          const active = pathname === menu.path ||
            (menu.path !== '/dashboard' && pathname.startsWith(menu.path));
          return (
            <button
              key={menu.path}
              onClick={() => router.push(menu.path)}
              style={{
                width: '100%',
                padding: '10px 12px',
                marginBottom: '2px',
                background: active ? 'rgba(59,130,246,0.15)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: active ? '#60a5fa' : '#94a3b8',
                fontSize: '13px',
                fontWeight: active ? 700 : 400,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textAlign: 'left',
                borderLeft: active ? '3px solid #3b82f6' : '3px solid transparent',
              }}
            >
              <span>{menu.icon}</span>
              <span>{menu.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 팀 코드 변경 */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid #334155' }}>
        <button
          onClick={() => {
            localStorage.removeItem('vp_team');
            router.push('/login');
          }}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>↩</span>
          <span>팀 코드 변경</span>
        </button>
      </div>
    </aside>
  );
}
