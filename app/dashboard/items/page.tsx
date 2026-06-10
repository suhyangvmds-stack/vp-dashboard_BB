'use client';
import { useEffect, useState, useRef } from 'react';
import { loadItems, saveItems, loadHistory, saveHistory, VPItem, generateId } from '@/lib/store';

const STATUS_LABELS: Record<string, string> = { active: '진행중', planned: '계획', out: '아웃' };
const STATUS_COLORS: Record<string, string> = { active: '#10b981', planned: '#3b82f6', out: '#6b7280' };

const emptyForm = {
  itemNumber: '', itemName: '', brand: '', location: '',
  startDate: '', endDate: '', status: 'active' as VPItem['status'],
  memo: '', reorderFrom: '', replaceWith: '', imageData: '',
};

export default function ItemsPage() {
  const [team, setTeam] = useState('');
  const [items, setItems] = useState<VPItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<VPItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [imagePreview, setImagePreview] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);
  const backupRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = localStorage.getItem('vp_team') || '';
    setTeam(t);
    setItems(loadItems(t));
  }, []);

  const filtered = items.filter(item => {
    const matchSearch = !search || item.itemNumber.includes(search) || item.itemName.includes(search);
    const matchStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchSearch && matchStatus;
  }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const openAdd = () => { setForm(emptyForm); setEditItem(null); setImagePreview(''); setShowForm(true); };
  const openEdit = (item: VPItem) => {
    setForm({
      itemNumber: item.itemNumber, itemName: item.itemName, brand: item.brand,
      location: item.location, startDate: item.startDate, endDate: item.endDate,
      status: item.status, memo: item.memo, reorderFrom: item.reorderFrom || '',
      replaceWith: item.replaceWith || '', imageData: (item as any).imageData || '',
    });
    setImagePreview((item as any).imageData || '');
    setEditItem(item);
    setShowForm(true);
  };

  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setForm(p => ({ ...p, imageData: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) processImageFile(file);
  };

  // 백업 내보내기
  const handleExport = () => {
    const data = { items, exportedAt: new Date().toISOString(), team };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vp_backup_${team}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 백업 불러오기
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (data.items && Array.isArray(data.items)) {
          if (confirm(`백업 파일에서 ${data.items.length}개 아이템을 불러올까요? 기존 데이터는 덮어씁니다.`)) {
            saveItems(team, data.items);
            setItems(data.items);
            alert('불러오기 완료!');
          }
        } else {
          alert('올바른 백업 파일이 아닙니다.');
        }
      } catch {
        alert('파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSave = () => {
    if (!form.itemNumber || !form.itemName || !form.startDate || !form.endDate) {
      alert('품번, 품명, 연출 기간은 필수입니다.');
      return;
    }
    const now = new Date().toISOString();
    let newItems: VPItem[];
    const history = loadHistory(team);
    if (editItem) {
      newItems = items.map(i => i.id === editItem.id ? { ...i, ...form, updatedAt: now } : i);
      history.push({ id: generateId(), itemNumber: form.itemNumber, action: 'update', changedAt: now });
    } else {
      const newItem: VPItem = { id: generateId(), ...form, createdAt: now, updatedAt: now };
      newItems = [newItem, ...items];
      history.push({ id: generateId(), itemNumber: form.itemNumber, action: 'create', changedAt: now });
    }
    saveItems(team, newItems);
    saveHistory(team, history);
    setItems(newItems);
    setShowForm(false);
  };

  const handleDelete = (item: VPItem) => {
    if (!confirm(`${item.itemNumber} (${item.itemName}) 를 삭제할까요?`)) return;
    const newItems = items.filter(i => i.id !== item.id);
    const history = loadHistory(team);
    history.push({ id: generateId(), itemNumber: item.itemNumber, action: 'delete', changedAt: new Date().toISOString() });
    saveItems(team, newItems);
    saveHistory(team, history);
    setItems(newItems);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>VP 아이템 관리</h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>VP 연출 아이템 등록 및 관리</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleExport} style={{
            padding: '10px 18px', background: '#10b981', border: 'none',
            borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
          }}>⬇ 백업 저장</button>
          <button onClick={() => backupRef.current?.click()} style={{
            padding: '10px 18px', background: '#f59e0b', border: 'none',
            borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
          }}>⬆ 백업 불러오기</button>
          <input ref={backupRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          <button onClick={openAdd} style={{
            padding: '10px 18px', background: '#3b82f6', border: 'none',
            borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
          }}>+ 아이템 등록</button>
        </div>
      </div>

      {/* 필터 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="품번 또는 품명 검색..."
          style={{ flex: 1, padding: '10px 14px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none' }} />
        {['all', 'active', 'planned', 'out'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            padding: '10px 16px', background: filterStatus === s ? '#3b82f6' : '#1e293b',
            border: '1px solid #334155', borderRadius: '8px',
            color: filterStatus === s ? 'white' : '#94a3b8', fontSize: '13px', cursor: 'pointer',
          }}>{s === 'all' ? '전체' : STATUS_LABELS[s]}</button>
        ))}
      </div>

      {/* 카드 그리드 */}
      {filtered.length === 0 ? (
        <div style={{ background: '#1e293b', borderRadius: '12px', padding: '60px', textAlign: 'center', color: '#475569', border: '1px solid #334155' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📦</div>
          <div style={{ fontSize: '16px', fontWeight: 600 }}>등록된 아이템이 없습니다</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {filtered.map(item => (
            <div key={item.id} style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
              <div style={{ height: '180px', background: '#0f172a', overflow: 'hidden', position: 'relative' }}>
                {(item as any).imageData ? (
                  <img src={(item as any).imageData} alt={item.itemName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', color: '#334155' }}>👔</div>
                )}
                <span style={{
                  position: 'absolute', top: '8px', left: '8px',
                  padding: '3px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 700,
                  background: `${STATUS_COLORS[item.status]}dd`, color: 'white',
                }}>{STATUS_LABELS[item.status]}</span>
              </div>
              <div style={{ padding: '12px' }}>
                <div style={{ color: '#60a5fa', fontSize: '12px', fontWeight: 600 }}>{item.itemNumber}</div>
                <div style={{ color: 'white', fontSize: '13px', fontWeight: 700, margin: '4px 0', lineHeight: 1.3 }}>{item.itemName}</div>
                <div style={{ color: '#64748b', fontSize: '11px' }}>{item.startDate} ~ {item.endDate}</div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                  <button onClick={() => openEdit(item)} style={{
                    flex: 1, padding: '6px', background: '#334155', border: 'none',
                    borderRadius: '6px', color: '#94a3b8', fontSize: '11px', cursor: 'pointer',
                  }}>수정</button>
                  <button onClick={() => handleDelete(item)} style={{
                    flex: 1, padding: '6px', background: '#334155', border: 'none',
                    borderRadius: '6px', color: '#ef4444', fontSize: '11px', cursor: 'pointer',
                  }}>삭제</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 등록/수정 모달 */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#1e293b', borderRadius: '16px', padding: '32px', width: '520px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{editItem ? 'VP 아이템 수정' : 'VP 아이템 등록'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* 이미지 업로드 - 드래그 앤 드롭 지원 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>상품 이미지</label>
              <div
                onClick={() => imgRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  height: '160px', background: isDragging ? '#1e3a5f' : '#0f172a', borderRadius: '10px',
                  border: `2px dashed ${isDragging ? '#3b82f6' : '#334155'}`, cursor: 'pointer', overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="미리보기" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: isDragging ? '#3b82f6' : '#475569' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>{isDragging ? '📂' : '🖼️'}</div>
                    <div style={{ fontSize: '13px' }}>{isDragging ? '여기에 놓으세요!' : '클릭하거나 이미지를 드래그하세요'}</div>
                    <div style={{ fontSize: '11px', marginTop: '4px' }}>공유폴더에서 파일 선택 가능</div>
                  </div>
                )}
              </div>
              <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
              {imagePreview && (
                <button onClick={() => { setImagePreview(''); setForm(p => ({ ...p, imageData: '' })); }}
                  style={{ marginTop: '6px', background: 'none', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer' }}>
                  ✕ 이미지 제거
                </button>
              )}
            </div>

            {[
              { label: '품번 *', key: 'itemNumber', placeholder: '예: 6314-322-020' },
              { label: '품명 *', key: 'itemName', placeholder: '' },
              { label: '브랜드', key: 'brand', placeholder: 'BB, BD...' },
              { label: '매장/위치', key: 'location', placeholder: '' },
              { label: '리오더 원품번', key: 'reorderFrom', placeholder: '리오더인 경우 원본 품번' },
              { label: '대체 코디 품번', key: 'replaceWith', placeholder: '재고 부족 시 대체 아이템' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '6px' }}>{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              {[{ label: '연출 시작일 *', key: 'startDate' }, { label: '연출 종료일 *', key: 'endDate' }].map(f => (
                <div key={f.key}>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '6px' }}>{f.label}</label>
                  <input type="date" value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '6px' }}>연출 상태</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as VPItem['status'] }))}
                style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}>
                <option value="active">진행중</option>
                <option value="planned">계획</option>
                <option value="out">아웃</option>
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '6px' }}>메모</label>
              <textarea value={form.memo} onChange={e => setForm(p => ({ ...p, memo: e.target.value }))}
                placeholder="변경 사유, 메모 등" rows={3}
                style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '12px', background: '#334155', border: 'none', borderRadius: '8px', color: '#94a3b8', fontSize: '14px', cursor: 'pointer' }}>취소</button>
              <button onClick={handleSave} style={{ flex: 2, padding: '12px', background: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>💾 저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}