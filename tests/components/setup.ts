// Component-test setup (jsdom project only). Adds jest-dom matchers, auto-cleans
// the DOM between tests, and stubs the two Next primitives that don't run outside
// the Next runtime — next/image and next/link — with plain elements so render()
// works without a full Next/app context.
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import React from 'react';

afterEach(() => cleanup());

// next/image → plain <img>, dropping Next-only props React would warn about.
vi.mock('next/image', () => ({
  default: ({ src, alt, width, height, className, style, title }: Record<string, unknown>) =>
    React.createElement('img', {
      src: typeof src === 'string' ? src : '',
      alt,
      width,
      height,
      className,
      style,
      title,
    }),
}));

// next/link → <a> that still fires the component's onClick but doesn't navigate
// (jsdom can't navigate; preventDefault keeps the console clean).
vi.mock('next/link', () => ({
  default: ({ href, children, onClick, ...rest }: Record<string, unknown>) =>
    React.createElement(
      'a',
      {
        href: typeof href === 'string' ? href : '#',
        onClick: (e: React.MouseEvent) => {
          e.preventDefault();
          (onClick as ((e: React.MouseEvent) => void) | undefined)?.(e);
        },
        ...rest,
      },
      children as React.ReactNode,
    ),
}));
