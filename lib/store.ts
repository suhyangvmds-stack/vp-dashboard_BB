// 팀 코드 및 데이터 관리
export const TEAMS: Record<string, { name: string; color: string }> = {
  BB: { name: '블루독베이비', color: '#4A90D9' },
  BD: { name: '블루독', color: '#2C5F9E' },
};
export type TeamCode = keyof typeof TEAMS;
export interface VPItem {
  id: string;
  itemNumber: string;
  itemName: string;
  brand: string;
  location: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'out' | 'planned';
  memo: string;
  reorderFrom?: string;
  replaceWith?: string;
  createdAt: string;
  updatedAt: string;
}
export interface SalesData {
  id: string;
  itemNumber: string;
  dataDate: string;
  size: string;
  salesQty: number;
  stockQty: number;
  receivedQty: number;
  salesAmount: number;
}
export interface DisplayHistory {
  id: string;
  itemNumber: string;
  action: 'create' | 'update' | 'delete';
  fieldChanged?: string;
  oldValue?: string;
  newValue?: string;
  memo?: string;
  changedAt: string;
}
// 품번 변환: 6314-322-020 → 46314322020
export function convertItemNumber(itemNumber: string): string {
  const digits = itemNumber.replace(/-/g, '');
  return '4' + digits;
}
// 로컬스토리지 키
export const STORAGE_KEYS = {
  TEAM: 'vp_team',
  ITEMS: (team: string) => `vp_items_${team}`,
  SALES: (team: string) => `vp_sales_${team}`,
  HISTORY: (team: string) => `vp_history_${team}`,
};
// 데이터 저장/불러오기
export function saveItems(team: string, items: VPItem[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.ITEMS(team), JSON.stringify(items));
  } catch (e) {
    console.warn('저장 용량 초과, 데이터 정리 중...');
    const trimmed = items.slice(-100);
    localStorage.setItem(STORAGE_KEYS.ITEMS(team), JSON.stringify(trimmed));
  }
}
export function loadItems(team: string): VPItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ITEMS(team));
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}
export function saveSales(team: string, sales: SalesData[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.SALES(team), JSON.stringify(sales));
  } catch (e) {
    console.warn('Sales 저장 용량 초과, 데이터 정리 중...');
    const trimmed = sales.slice(-500);
    localStorage.setItem(STORAGE_KEYS.SALES(team), JSON.stringify(trimmed));
  }
}
export function loadSales(team: string): SalesData[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SALES(team));
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}
export function saveHistory(team: string, history: DisplayHistory[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.HISTORY(team), JSON.stringify(history));
  } catch (e) {
    console.warn('History 저장 용량 초과, 데이터 정리 중...');
    const trimmed = history.slice(-200);
    localStorage.setItem(STORAGE_KEYS.HISTORY(team), JSON.stringify(trimmed));
  }
}
export function loadHistory(team: string): DisplayHistory[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY(team));
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}