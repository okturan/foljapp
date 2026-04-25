'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/browse', label: 'Browse' },
  { href: '/playground', label: 'Playground' },
  { href: '/practice', label: 'Practice' },
  { href: '/articles', label: 'Articles' },
  { href: '/random', label: 'Random' },
];

export function NavHeader() {
  const pathname = usePathname() ?? '/';
  return (
    <nav className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center gap-6 px-6 py-3 text-sm">
        <Link href="/" className="font-mono font-semibold text-stone-900">
          foljapp
        </Link>
        <ul className="flex items-center gap-4">
          {ITEMS.map((it) => {
            const active =
              it.href === '/' ? pathname === '/' : pathname.startsWith(it.href);
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'transition-colors',
                    active
                      ? 'text-stone-900'
                      : 'text-stone-500 hover:text-stone-700',
                  )}
                >
                  {it.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
