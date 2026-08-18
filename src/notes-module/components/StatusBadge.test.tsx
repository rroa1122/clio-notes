import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import StatusBadge from './StatusBadge';

describe('StatusBadge component', () => {
    it('renders present badge correctly with dot indicator and styles', () => {
        const html = renderToStaticMarkup(<StatusBadge status="present" />);
        expect(html).toContain('Present');
        expect(html).toContain('bg-rose-50');
        expect(html).toContain('bg-rose-500');
        expect(html).toContain('rounded-full');
    });

    it('renders denied badge correctly', () => {
        const html = renderToStaticMarkup(<StatusBadge status="denied" />);
        expect(html).toContain('Denied');
        expect(html).toContain('bg-emerald-50');
        expect(html).toContain('bg-emerald-500');
    });

    it('renders absent badge correctly', () => {
        const html = renderToStaticMarkup(<StatusBadge status="absent" />);
        expect(html).toContain('Absent');
        expect(html).toContain('bg-emerald-50');
        expect(html).toContain('bg-emerald-500');
    });

    it('renders unknown badge correctly', () => {
        const html = renderToStaticMarkup(<StatusBadge status="unknown" />);
        expect(html).toContain('Unknown');
        expect(html).toContain('bg-amber-50');
        expect(html).toContain('bg-amber-500');
    });

    it('renders not_mentioned badge correctly', () => {
        const html = renderToStaticMarkup(<StatusBadge status="not_mentioned" />);
        expect(html).toContain('Not Mentioned');
        expect(html).toContain('bg-slate-100/80');
        expect(html).toContain('bg-slate-400');
    });

    it('applies custom className if provided', () => {
        const html = renderToStaticMarkup(<StatusBadge status="present" className="custom-test-class" />);
        expect(html).toContain('custom-test-class');
    });

    it('falls back to not_mentioned if status is invalid', () => {
        // @ts-expect-error Testing fallback behavior
        const html = renderToStaticMarkup(<StatusBadge status="invalid_status" />);
        expect(html).toContain('Not Mentioned');
    });
});
