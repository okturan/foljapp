import type { ReactNode } from 'react';

export default function ArticlesLayout({ children }: { children: ReactNode }) {
  return (
    <main className="prose mx-auto max-w-3xl px-6 py-10">
      <div className="prose prose-stone max-w-none">{children}</div>
    </main>
  );
}
