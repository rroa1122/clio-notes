import { describe, expect, it, vi } from 'vitest';
import { pollTaskUntilTerminal } from './taskPolling';

describe('pollTaskUntilTerminal', () => {
    it('polls sequentially until completion', async () => {
        let activeRequests = 0;
        let maxConcurrentRequests = 0;
        const fetchTask = vi.fn(async () => {
            activeRequests += 1;
            maxConcurrentRequests = Math.max(maxConcurrentRequests, activeRequests);
            await Promise.resolve();
            activeRequests -= 1;
            return { status: fetchTask.mock.calls.length < 3 ? 'processing' : 'completed', result_summary: { ok: true } };
        });

        const result = await pollTaskUntilTerminal({ fetchTask, intervalMs: 0, maxAttempts: 5 });

        expect(result.state).toBe('completed');
        expect(fetchTask).toHaveBeenCalledTimes(3);
        expect(maxConcurrentRequests).toBe(1);
    });

    it('returns failed immediately for a terminal failed task', async () => {
        const fetchTask = vi.fn().mockResolvedValue({ status: 'failed' });

        const result = await pollTaskUntilTerminal({ fetchTask, intervalMs: 0 });

        expect(result.state).toBe('failed');
        expect(fetchTask).toHaveBeenCalledTimes(1);
    });

    it('retries transient query errors and can still complete', async () => {
        const onPollError = vi.fn();
        const fetchTask = vi.fn()
            .mockRejectedValueOnce(new Error('temporary'))
            .mockResolvedValueOnce({ status: 'completed' });

        const result = await pollTaskUntilTerminal({ fetchTask, onPollError, intervalMs: 0 });

        expect(result.state).toBe('completed');
        expect(onPollError).toHaveBeenCalledTimes(1);
    });

    it('times out after the configured number of attempts', async () => {
        const fetchTask = vi.fn().mockResolvedValue({ status: 'processing' });

        const result = await pollTaskUntilTerminal({ fetchTask, intervalMs: 0, maxAttempts: 3 });

        expect(result.state).toBe('timeout');
        expect(fetchTask).toHaveBeenCalledTimes(3);
    });

    it('cancels without issuing another request', async () => {
        const controller = new AbortController();
        controller.abort();
        const fetchTask = vi.fn();

        await expect(pollTaskUntilTerminal({ fetchTask, signal: controller.signal })).rejects.toMatchObject({
            name: 'AbortError',
        });
        expect(fetchTask).not.toHaveBeenCalled();
    });
});

