'use client';
import { useEffect, useState } from 'react';
import { loadHistory, DisplayHistory } from '@/lib/store';

const ACTION_LABELS: Record<string, string> = { create: '등록', update: '수정', delete: '삭제' };
const ACTION_COLORS: Record<string, string> = { create: '#10b981', update: '#3b82f6', delete: '#ef4444' };

export default function HistoryPage() {
  const [history, setHistory] = useState<DisplayHistory[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const t = localStorage.getItem('vp_team') || '';
    const h = loadHistory(t);
    setHistory([...h].reverse());
  }, []);

  const filtered = history.filter(h => {
    const matchSearch = !search || h.itemNumber.includes(search);
    const matchFilter = filter === 'all' || h.action === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>연출 이력</h1>
        <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>VP 아이템 등록·수정·삭제 이력</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="품번 검색..."
          style={{
            flex: 1, padding: '10px 14px', background: '#1e293b',
            border: '1px solid #334155', borderRadius: '8px',
            color: 'white', fontSize: '13px', outline: 'none',
          }}
        />
        {['all', 'create', 'update', 'delete'].map(a => (
          <button key={a} onClick={() => setFilter(a)} style={{
            padding: '10px 14px',
            background: filter === a ? '#3b82f6' : '#1e293b',
            border: '1px solid #334155', borderRadius: '8px',
            color: filter === a ? 'white' : '#94a3b8',
            fontSize: '13px', cursor: 'pointer',
          }}>
            {a === 'all' ? '전체' : ACTION_LABELS[a]}
          </button>
        ))}
      </div>

      <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#0f172a' }}>
              {['액션', '품번', '변경 내용', '메모', '일시'].map(h => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#475569' }}>이력이 없습니다</td></tr>
            ) : filtered.map(h => (
              <tr key={h.id} style={{ borderTop: '1px solid #334155' }}>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{
                    padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                    background: `${ACTION_COLORS[h.action]}20`, color: ACTION_COLORS[h.action],
                  }}>{ACTION_LABELS[h.action]}</span>
                </td>
                <td style={{ padding: '12px 14px', color: '#60a5fa', fontWeight: 600 }}>{h.itemNumber}</td>
                <td style={{ padding: '12px 14px', color: '#94a3b8' }}>
                  {h.fieldChanged ? `${h.fieldChanged}: ${h.oldValue} → ${h.newValue}` : '-'}
                </td>
                <td style={{ padding: '12px 14px', color: '#64748b' }}>{h.memo || '-'}</td>
                <td style={{ padding: '12px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>
                  {new Date(h.changedAt).toLocaleString('ko-KR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
