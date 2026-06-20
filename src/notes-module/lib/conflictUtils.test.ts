import { describe, it, expect } from 'vitest';
import { parseTimeTo24h, toISO, areOverlapping } from './conflictUtils';

describe('conflictUtils', () => {
    describe('parseTimeTo24h', () => {
        it('parses AM times correctly', () => {
            expect(parseTimeTo24h('10:30 AM')).toBe('10:30');
            expect(parseTimeTo24h('12:15 AM')).toBe('00:15');
            expect(parseTimeTo24h('1:05 AM')).toBe('01:05');
        });

        it('parses PM times correctly', () => {
            expect(parseTimeTo24h('2:45 PM')).toBe('14:45');
            expect(parseTimeTo24h('12:00 PM')).toBe('12:00');
            expect(parseTimeTo24h('11:59 PM')).toBe('23:59');
        });

        it('parses 24h times correctly', () => {
            expect(parseTimeTo24h('09:00')).toBe('09:00');
            expect(parseTimeTo24h('23:15')).toBe('23:15');
        });

        it('returns null for invalid strings', () => {
            expect(parseTimeTo24h('')).toBeNull();
            expect(parseTimeTo24h('—')).toBeNull();
            expect(parseTimeTo24h('invalid')).toBeNull();
        });
    });

    describe('toISO', () => {
        it('normalizes MM/DD/YYYY and AM/PM time', () => {
            const result = toISO('01/20/2026', '10:00 AM');
            expect(result).toBe('2026-01-20T10:00:00.000Z');
        });

        it('normalizes ISO date and 24h time', () => {
            const result = toISO('2026-02-06', '23:19');
            expect(result).toBe('2026-02-06T23:19:00.000Z');
        });

        it('returns null if any component is missing', () => {
            expect(toISO(null, '10:00 AM')).toBeNull();
            expect(toISO('2026-02-06', null)).toBeNull();
        });
    });

    describe('areOverlapping', () => {
        const startA = '2026-01-20T10:00:00.000Z';
        const endA = '2026-01-20T11:00:00.000Z';

        it('detects partial overlap (B starts inside A)', () => {
            const startB = '2026-01-20T10:30:00.000Z';
            const endB = '2026-01-20T11:30:00.000Z';
            expect(areOverlapping(startA, endA, startB, endB)).toBe(true);
        });

        it('detects enclosure (B inside A)', () => {
            const startB = '2026-01-20T10:15:00.000Z';
            const endB = '2026-01-20T10:45:00.000Z';
            expect(areOverlapping(startA, endA, startB, endB)).toBe(true);
        });

        it('returns false for adjacent ranges (B starts when A ends)', () => {
            const startB = '2026-01-20T11:00:00.000Z';
            const endB = '2026-01-20T12:00:00.000Z';
            expect(areOverlapping(startA, endA, startB, endB)).toBe(false);
        });

        it('returns false for adjacent ranges (A starts when B ends)', () => {
            const startB = '2026-01-20T09:00:00.000Z';
            const endB = '2026-01-20T10:00:00.000Z';
            expect(areOverlapping(startA, endA, startB, endB)).toBe(false);
        });

        it('returns false for distant ranges', () => {
            const startB = '2026-01-20T13:00:00.000Z';
            const endB = '2026-01-20T14:00:00.000Z';
            expect(areOverlapping(startA, endA, startB, endB)).toBe(false);
        });
    });
});
