'use client';
import { useEffect, useState } from 'react';
import { loadItems, loadSales, VPItem, SalesData } from '@/lib/store';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function DashboardPage() {
  const [team, setTeam] = useState('');
  const [items, setItems] = useState<VPItem[]>([]);
  const [sales, setSales] = useState<SalesData[]>([]);
  const [period, setPeriod] = useState<'today'|'week'|'custom'|'all'>('week');
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('sellthrough');
  const [warningOnly, setWarningOnly] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('vp_team') || '';
    setTeam(t);
    setItems(loadItems(t));
    setSales(loadSales(t));
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const getPeriodRange = () => {
    const now = new Date();
    if (period === 'today') return { start: today, end: today };
    if (period === 'week') {
      const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { start: mon.toISOString().split('T')[0], end: sun.toISOString().split('T')[0] };
    }
    return { start: '2000-01-01', end: '2099-12-31' };
  };

  const { start, end } = getPeriodRange();
  const activeItems = items.filter(i => i.status === 'active' && i.startDate <= end && i.endDate >= start);

  const calcStats = (itemNumber: string) => {
    const norm = itemNumber.replace(/-/g, '');
    const itemSales = sales.filter(s => s.itemNumber.replace(/-/g, '') === norm);
    const totalSales = itemSales.reduce((sum, s) => sum + s.salesQty, 0);
    const totalStock = itemSales.reduce((sum, s) => sum + s.stockQty, 0);
    const totalAmt = itemSales.reduce((sum, s) => sum + s.salesAmount, 0);
    const sellThrough = totalSales + totalStock > 0 ? Math.round(totalSales / (totalSales + totalStock) * 100) : 0;
    const stockRate = totalSales + totalStock > 0 ? Math.round(totalStock / (totalSales + totalStock) * 100) : 100;
    return { totalSales, totalStock, totalAmt, sellThrough, stockRate };
  };

  // 차트 데이터
  const chartData = (() => {
    const dates = [...new Set(sales.map(s => s.dataDate))].sort();
    return dates.slice(-20).map(date => {
      const dayItems = items.filter(i => i.status === 'active');
      let vpTotal = 0, vpCount = 0, storeTotal = 0, storeCount = 0;
      dayItems.forEach(item => {
        const norm = item.itemNumber.replace(/-/g, '');
        const daySales = sales.filter(s => s.itemNumber.replace(/-/g, '') === norm && s.dataDate <= date);
        const totalS = daySales.reduce((sum, s) => sum + s.salesQty, 0);
        const totalSt = daySales.reduce((sum, s) => sum + s.stockQty, 0);
        if (totalS + totalSt > 0) { vpTotal += totalS / (totalS + totalSt) * 100; vpCount++; }
      });
      return {
        date: date.slice(5),
        'VP 평균': vpCount > 0 ? Math.round(vpTotal / vpCount) : 0,
        'gap': 0,
        '전사 평균': storeCount > 0 ? Math.round(storeTotal / storeCount) : 0,
      };
    });
  })();

  // 판매 상위/주목 필요
  const ranked = [...activeItems].map(item => ({ item, ...calcStats(item.itemNumber) }))
    .sort((a, b) => b.sellThrough - a.sellThrough);
  const top3 = ranked.slice(0, 3);
  const warning3 = [...ranked].sort((a, b) => a.stockRate - b.stockRate).slice(0, 3);

  // 필터링된 아이템
  let displayItems = [...activeItems].map(item => ({ item, ...calcStats(item.itemNumber) }));
  if (warningOnly) displayItems = displayItems.filter(d => d.stockRate < 30);
  if (searchText) displayItems = displayItems.filter(d =>
    d.item.itemNumber.includes(searchText) || d.item.itemName.includes(searchText));
  if (sortBy === 'sellthrough') displayItems.sort((a, b) => b.sellThrough - a.sellThrough);
  if (sortBy === 'sales') displayItems.sort((a, b) => b.totalSales - a.totalSales);
  if (sortBy === 'stock') displayItems.sort((a, b) => a.stockRate - b.stockRate);

  const latestERP = sales.length > 0 ? [...sales].sort((a,b) => b.dataDate.localeCompare(a.dataDate))[0].dataDate : null;
  const avgSell = ranked.length > 0 ? Math.round(ranked.reduce((s,r) => s + r.sellThrough, 0) / ranked.length) : 0;
  const warnCount = ranked.filter(r => r.stockRate < 30).length;

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', color: '#1a1a2e' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#1a1a2e' }}>VP 판매 반응 대시보드</h1>
          <p style={{ color: '#888', fontSize: '13px', margin: '4px 0 0' }}>Visual Presentation 효과 모니터링</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ padding: '8px 14px', background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', color: '#666', fontSize: '12px', cursor: 'pointer' }}>🔍 DB 진단</button>
          <button style={{ padding: '8px 14px', background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', color: '#666', fontSize: '12px', cursor: 'pointer' }}>📊 ERP 재동기화</button>
          <button onClick={() => { setItems(loadItems(team)); setSales(loadSales(team)); }}
            style={{ padding: '8px 14px', background: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', color: '#666', fontSize: '12px', cursor: 'pointer' }}>🔄 새로고침</button>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '20px' }}>
        {[
          { label: '조회 기간 VP 아이템', value: activeItems.length, unit: '개', icon: '📦', color: '#6c63ff' },
          { label: '평균 판매율', value: `${avgSell}%`, unit: '', icon: '📈', color: '#6c63ff' },
          { label: '사이즈 경고', value: warnCount, unit: '개', icon: '⚠️', color: '#f59e0b' },
        ].map(c => (
          <div key={c.label} style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #eee' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '16px' }}>{c.icon}</span>
              <span style={{ color: '#888', fontSize: '13px' }}>{c.label}</span>
            </div>
            <div style={{ color: c.color, fontSize: '32px', fontWeight: 800 }}>{c.value}</div>
            {c.unit && <div style={{ color: '#aaa', fontSize: '13px' }}>{c.unit}</div>}
          </div>
        ))}
      </div>

      {/* 차트 + 우측 패널 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px', marginBottom: '20px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #eee' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#6c63ff' }}>📊</span>
              <span style={{ fontWeight: 700, color: '#1a1a2e' }}>VP 아이템 판매율 추이</span>
            </div>
            {latestERP && <span style={{ fontSize: '12px', color: '#888' }}>VP 집계 시작: {latestERP.slice(5)}</span>}
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#aaa' }} />
                <YAxis tick={{ fontSize: 11, fill: '#aaa' }} unit="%" />
                <Tooltip formatter={(v: any) => `${v}%`} />
                <Legend />
                <Line type="monotone" dataKey="VP 평균" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="gap" stroke="#10b981" strokeWidth={1} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
              ERP 미업로드
            </div>
          )}
        </div>

        {/* 우측: 판매 상위 / 주목 필요 */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #eee' }}>
          <div style={{ fontWeight: 700, color: '#1a1a2e', marginBottom: '14px' }}>📊 VP 연출 현황</div>
          <div style={{ color: '#f97316', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>🏆 판매율 상위</div>
          {top3.map((r, i) => (
            <div key={r.item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5f5f5', fontSize: '12px' }}>
              <div>
                <span style={{ color: '#aaa', marginRight: '6px' }}>{i+1}</span>
                <span style={{ color: '#333' }}>{r.item.itemName.slice(0,10)}...</span>
                <div style={{ color: '#aaa', fontSize: '11px' }}>{r.item.itemNumber}</div>
              </div>
              <span style={{ color: '#f97316', fontWeight: 700 }}>{r.sellThrough}%</span>
            </div>
          ))}
          <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: 700, margin: '14px 0 8px' }}>⚠️ 주목 필요 (저조)</div>
          {warning3.map((r, i) => (
            <div key={r.item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5f5f5', fontSize: '12px' }}>
              <div>
                <span style={{ color: '#aaa', marginRight: '6px' }}>{i+1}</span>
                <span style={{ color: '#333' }}>{r.item.itemName.slice(0,10)}...</span>
              </div>
              <span style={{ color: '#ef4444', fontWeight: 700 }}>{r.sellThrough}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* 기간 필터 + 검색 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {[['today','오늘'],['week','이번 주'],['custom','직접 입력'],['all','연출 전체']].map(([v,l]) => (
            <button key={v} onClick={() => setPeriod(v as any)} style={{
              padding: '6px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', border: 'none',
              background: period === v ? '#6c63ff' : 'white',
              color: period === v ? 'white' : '#666',
              fontWeight: period === v ? 700 : 400,
            }}>{l}</button>
          ))}
          <span style={{ color: '#aaa', fontSize: '12px', marginLeft: '8px' }}>{start} ~ {end}</span>
          {latestERP && <span style={{ color: '#6c63ff', fontSize: '12px' }}>최근 ERP: <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>{latestERP}</span></span>}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => setWarningOnly(w => !w)} style={{
            padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
            background: warningOnly ? '#fef3c7' : 'white', border: '1px solid #e0e0e0', color: '#666',
          }}>⚠️ 경고만 보기</button>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
            padding: '6px 12px', borderRadius: '6px', fontSize: '12px', border: '1px solid #e0e0e0',
            background: 'white', color: '#666', cursor: 'pointer',
          }}>
            <option value="sellthrough">판매율순</option>
            <option value="sales">판매수량순</option>
            <option value="stock">재고여유순</option>
          </select>
          <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="품번·이름 검색"
            style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px', border: '1px solid #e0e0e0', background: 'white', color: '#333', outline: 'none', width: '140px' }} />
        </div>
      </div>

      {/* 아이템 카드 그리드 */}
      {displayItems.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '12px', padding: '60px', textAlign: 'center', color: '#ccc', border: '1px solid #eee' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📦</div>
          <div>등록된 VP 아이템이 없습니다</div>
          <div style={{ fontSize: '13px', marginTop: '6px' }}>VP 아이템 메뉴에서 아이템을 등록하세요</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
          {displayItems.map(({ item, sellThrough, totalSales, stockRate, totalAmt }) => {
            const progressPct = item.startDate && item.endDate ? (() => {
              const s = new Date(item.startDate).getTime();
              const e2 = new Date(item.endDate).getTime();
              const n = new Date(today).getTime();
              return Math.min(100, Math.max(0, Math.round((n - s) / (e2 - s) * 100)));
            })() : 0;

            return (
              <div key={item.id} style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #eee', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                {/* 이미지 */}
                <div style={{ height: '220px', background: '#f5f5f5', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {(item as any).imageData ? (
                    <img src={(item as any).imageData} alt={item.itemName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: '#ccc', fontSize: '14px' }}>이미지 없음</span>
                  )}
                </div>

                {/* 진행 바 */}
                <div style={{ height: '3px', background: '#eee' }}>
                  <div style={{ height: '100%', width: `${progressPct}%`, background: '#6c63ff' }} />
                </div>

                {/* 정보 */}
                <div style={{ padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a2e', flex: 1 }}>{item.itemName}</div>
                    <span style={{ color: sellThrough >= 30 ? '#10b981' : '#f97316', fontSize: '13px', fontWeight: 700, marginLeft: '8px' }}>
                      {sellThrough >= 30 ? '↑' : '—'} +{sellThrough}%
                    </span>
                  </div>
                  <div style={{ color: '#aaa', fontSize: '12px', marginBottom: '8px' }}>{item.itemNumber}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginBottom: '8px' }}>
                    <span>{item.startDate?.slice(5)}</span>
                    <span style={{ color: '#6c63ff', fontWeight: 600 }}>{progressPct}% 진행</span>
                    <span>{item.endDate?.slice(5)}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', padding: '10px 0', borderTop: '1px solid #f5f5f5', borderBottom: '1px solid #f5f5f5', marginBottom: '8px' }}>
                    {[
                      { label: '누적 판매율', value: `${sellThrough}%` },
                      { label: '판매수량', value: `${totalSales}` },
                      { label: '재고 여유율', value: `${stockRate}%` },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign: 'center' }}>
                        <div style={{ color: '#aaa', fontSize: '10px', marginBottom: '4px' }}>{s.label}</div>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a2e' }}>{s.value}</div>
                        <div style={{ color: '#10b981', fontSize: '10px' }}>정상</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: '#aaa' }}>누적 매출</span>
                    <span style={{ fontWeight: 700, color: '#1a1a2e' }}>{totalAmt > 0 ? `${Math.round(totalAmt/10000)}만원` : '-'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
