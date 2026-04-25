import type { MDXComponents } from 'mdx/types';

import { articleMdxComponents } from '@/components/article-mdx-components';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    ...articleMdxComponents,
  };
}
