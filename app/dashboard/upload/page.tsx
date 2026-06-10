'use client';
import { useEffect, useState, useRef } from 'react';
import { loadItems, loadSales, saveSales, saveItems, SalesData, VPItem, generateId } from '@/lib/store';
import * as XLSX from 'xlsx';

interface LogEntry { type: 'success' | 'error' | 'info'; message: string; }

export default function UploadPage() {
  const [team, setTeam] = useState('');
  const [erpLogs, setErpLogs] = useState<LogEntry[]>([]);
  const [imgLogs, setImgLogs] = useState<LogEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const [items, setItems] = useState<VPItem[]>([]);
  const erpRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = localStorage.getItem('vp_team') || '';
    setTeam(t);
    setItems(loadItems(t));
  }, []);

  const addErpLog = (type: LogEntry['type'], message: string) =>
    setErpLogs(prev => [{ type, message }, ...prev]);
  const addImgLog = (type: LogEntry['type'], message: string) =>
    setImgLogs(prev => [{ type, message }, ...prev]);

  const processErpFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files).filter(f => /\.(xlsx|xls|csv)$/i.test(f.name));
    if (!fileArr.length) { addErpLog('error', '엑셀 또는 CSV 파일을 선택해주세요.'); return; }
    setUploading(true);
    const existingSales = loadSales(team);
    const newSales: SalesData[] = [...existingSales];
    let totalAdded = 0, totalSkipped = 0;

    for (const file of fileArr) {
      try {
        addErpLog('info', `처리 중: ${file.name}`);
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data, { type: 'array' });
        const dateMatch = file.name.match(/(\d{8})/);
        const fileDate = dateMatch
          ? `${dateMatch[1].slice(0,4)}-${dateMatch[1].slice(4,6)}-${dateMatch[1].slice(6,8)}`
          : new Date().toISOString().split('T')[0];

        for (const sheetName of wb.SheetNames) {
          const sheet = wb.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

          let headerRow = -1;
          for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const row = rows[i];
            if (row && row.some((c: any) => String(c).trim() === 'STYLE NO' || String(c).trim() === '품번')) {
              headerRow = i; break;
            }
          }
          if (headerRow === -1) continue;

          const headers = rows[headerRow].map((h: any) => String(h || '').trim());
          const getIdx = (kws: string[]) => headers.findIndex((h: string) => h && kws.some(k => h.includes(k)));

          const idxNum = getIdx(['STYLE NO', '품번', '품목번호']);
          const idxSalesQty = getIdx(['판매량', '판매수량']);
          const idxReceivedQty = getIdx(['입고량', '입고수량']);
          const idxSalesAmt = getIdx(['TAG가 금액', '실판매 금액', '판매금액', '매출액']);

          for (let r = headerRow + 1; r < rows.length; r++) {
            const row = rows[r];
            if (!row || !row[idxNum]) continue;
            const rawNum = String(row[idxNum]).trim();
            if (!rawNum || rawNum === 'undefined') continue;

            const norm = rawNum.replace(/-/g, '');
            const isDup = newSales.some(s =>
              s.itemNumber.replace(/-/g, '') === norm && s.dataDate === fileDate
            );
            if (isDup) { totalSkipped++; continue; }

            // VP 아이템에 등록된 품번만 저장 (용량 절약)
            const currentItems = loadItems(team);
            const isVPItem = currentItems.some(item => item.itemNumber.replace(/-/g, '') === norm);
            if (!isVPItem) continue;

            const salesQty = Number(row[idxSalesQty] || 0);
            const receivedQty = Number(row[idxReceivedQty] || 0);
            if (salesQty === 0 && receivedQty === 0) continue;

            const stockQty = Math.max(0, receivedQty - salesQty);
            newSales.push({
              id: generateId(),
              itemNumber: rawNum,
              dataDate: fileDate,
              size: '전체',
              salesQty,
              stockQty,
              receivedQty,
              salesAmount: Number(row[idxSalesAmt] || 0),
            });
            totalAdded++;
          }
        }
        addErpLog('success', `✅ ${file.name} — ${totalAdded}건 추가`);
      } catch (err: any) {
        addErpLog('error', `❌ ${file.name} 실패: ${err?.message || err}`);
      }
    }
    saveSales(team, newSales);
    addErpLog('success', `완료! 총 ${totalAdded}건 저장, ${totalSkipped}건 중복 스킵`);
    setUploading(false);
  };

  const processImageFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files).filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name));
    if (!fileArr.length) { addImgLog('error', '이미지 파일을 선택해주세요.'); return; }
    setImgUploading(true);
    const currentItems = loadItems(team);
    let matched = 0, unmatched = 0;

    for (const file of fileArr) {
      if (!file.name.includes('_00')) continue;
      const numMatch = file.name.match(/4(\d{9})/);
      if (!numMatch) { addImgLog('error', `❌ ${file.name} — 품번 인식 실패`); unmatched++; continue; }
      const digits = numMatch[1] + '0';
      const itemNum = `${digits.slice(0,4)}-${digits.slice(4,7)}-${digits.slice(7,10)}`;
      const item = currentItems.find(i => i.itemNumber === itemNum);
      if (!item) { addImgLog('error', `❌ ${file.name} — 품번 ${itemNum} 없음`); unmatched++; continue; }

      await new Promise<void>(resolve => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX = 600;
          const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', 0.7);
          URL.revokeObjectURL(url);
          const updated = currentItems.map(i =>
            i.id === item.id ? { ...i, imageData: compressed, updatedAt: new Date().toISOString() } : i
          );
          saveItems(team, updated);
          setItems([...updated]);
          addImgLog('success', `✅ ${itemNum} (${item.itemName}) 이미지 등록`);
          matched++;
          resolve();
        };
        img.src = url;
      });
    }
    addImgLog('info', `완료! ${matched}개 매칭, ${unmatched}개 실패`);
    setImgUploading(false);
  };

  const registeredImgs = items.filter(i => (i as any).imageData);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#1a1a2e' }}>데이터 업로드</h1>
        <p style={{ color: '#888', fontSize: '13px', margin: '4px 0 0' }}>ERP 판매 데이터와 VP 이미지를 업로드하세요</p>
      </div>

      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
        <div style={{ color: '#3b82f6', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>📋 날짜 인식 규칙 (자동)</div>
        <div style={{ color: '#64748b', fontSize: '12px', lineHeight: 1.8 }}>
          파일명에 날짜 8자리 포함 시 자동 인식 (예: <code style={{ color: '#3b82f6' }}>20260507.xlsx</code>)<br/>
          현재 등록된 VP 아이템: <strong style={{ color: '#3b82f6' }}>{items.length}개</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #eee' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '20px' }}>📊</span>
            <div>
              <div style={{ fontWeight: 700, color: '#1a1a2e' }}>ERP 판매 데이터</div>
              <div style={{ color: '#888', fontSize: '12px' }}>파일명 날짜 자동 인식</div>
            </div>
          </div>
          <div onDrop={e => { e.preventDefault(); processErpFiles(e.dataTransfer.files); }}
            onDragOver={e => e.preventDefault()} onClick={() => erpRef.current?.click()}
            style={{ border: '2px dashed #e2e8f0', borderRadius: '10px', padding: '40px', textAlign: 'center', cursor: 'pointer', background: '#f8fafc', marginBottom: '12px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
            <div style={{ fontWeight: 600, color: '#475569', marginBottom: '4px' }}>ERP 엑셀 파일 업로드</div>
            <div style={{ color: '#94a3b8', fontSize: '12px' }}>xlsx, xls, csv 지원 · 클릭하거나 드래그</div>
          </div>
          <button onClick={() => erpRef.current?.click()} disabled={uploading}
            style={{ width: '100%', padding: '12px', background: '#10b981', border: 'none', borderRadius: '8px', color: 'white', fontSize: '14px', fontWeight: 700, cursor: 'pointer', marginBottom: '12px' }}>
            📂 파일 직접 선택
          </button>
          <input ref={erpRef} type="file" multiple accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
            onChange={e => e.target.files && processErpFiles(e.target.files)} />
          <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px', maxHeight: '150px', overflowY: 'auto', minHeight: '60px' }}>
            {erpLogs.length === 0
              ? <div style={{ color: '#ccc', fontSize: '12px', textAlign: 'center' }}>업로드 결과가 여기에 표시됩니다</div>
              : erpLogs.map((log, i) => (
                <div key={i} style={{ fontSize: '11px', padding: '3px 0', color: log.type === 'success' ? '#10b981' : log.type === 'error' ? '#ef4444' : '#888' }}>{log.message}</div>
              ))}
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #eee' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '20px' }}>🖼️</span>
            <div>
              <div style={{ fontWeight: 700, color: '#1a1a2e' }}>VP 이미지</div>
              <div style={{ color: '#888', fontSize: '12px' }}>품번 자동 매칭</div>
            </div>
          </div>
          <div style={{ background: '#f3f0ff', border: '1px solid #c4b5fd', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '12px', color: '#7c3aed' }}>
            파일명 규칙: 4 + 품번숫자 + _00 (예: <code>4631431301_00_1000.jpg</code>)
          </div>
          <div onDrop={e => { e.preventDefault(); processImageFiles(e.dataTransfer.files); }}
            onDragOver={e => e.preventDefault()} onClick={() => imgRef.current?.click()}
            style={{ border: '2px dashed #e2e8f0', borderRadius: '10px', padding: '40px', textAlign: 'center', cursor: 'pointer', background: '#f8fafc', marginBottom: '12px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🖼️</div>
            <div style={{ fontWeight: 600, color: '#475569', marginBottom: '4px' }}>VP 이미지 업로드</div>
            <div style={{ color: '#94a3b8', fontSize: '12px' }}>클릭하거나 파일을 드래그하세요</div>
          </div>
          <button onClick={() => imgRef.current?.click()} disabled={imgUploading}
            style={{ width: '100%', padding: '12px', background: '#7c3aed', border: 'none', borderRadius: '8px', color: 'white', fontSize: '14px', fontWeight: 700, cursor: 'pointer', marginBottom: '12px' }}>
            📂 이미지 파일 선택
          </button>
          <input ref={imgRef} type="file" multiple accept="image/*" style={{ display: 'none' }}
            onChange={e => e.target.files && processImageFiles(e.target.files)} />
          <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px', maxHeight: '150px', overflowY: 'auto', minHeight: '60px' }}>
            {imgLogs.length === 0
              ? <div style={{ color: '#ccc', fontSize: '12px', textAlign: 'center' }}>업로드 결과가 여기에 표시됩니다</div>
              : imgLogs.map((log, i) => (
                <div key={i} style={{ fontSize: '11px', padding: '3px 0', color: log.type === 'success' ? '#10b981' : log.type === 'error' ? '#ef4444' : '#888' }}>{log.message}</div>
              ))}
          </div>
        </div>
      </div>

      {registeredImgs.length > 0 && (
        <div style={{ marginTop: '24px', background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #eee' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontWeight: 700, color: '#1a1a2e' }}>🖼️ 현재 등록된 VP 이미지</div>
            <span style={{ color: '#888', fontSize: '13px' }}>{registeredImgs.length}개</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
            {registeredImgs.map(item => (
              <div key={item.id} style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #eee' }}>
                <img src={(item as any).imageData} alt={item.itemName} style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                <div style={{ padding: '6px', background: '#f8fafc' }}>
                  <div style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 600 }}>{item.itemNumber}</div>
                  <div style={{ fontSize: '11px', color: '#475569', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{item.itemName}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
