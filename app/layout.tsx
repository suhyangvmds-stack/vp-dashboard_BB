import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VP 판매 모니터링',
  description: 'Visual Presentation 판매 반응 대시보드',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
