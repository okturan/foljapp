import type { ReactNode } from 'react';

export default function ArticlesLayout({ children }: { children: ReactNode }) {
  return (
    <main className="article-page mx-auto w-full max-w-4xl px-6 py-10 sm:py-14">
      <article className="article-body">{children}</article>
    </main>
  );
}
