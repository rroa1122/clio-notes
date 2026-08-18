export interface PollableTask {
    status: string;
}

export type TaskPollingResult<T extends PollableTask> =
    | { state: 'completed'; task: T }
    | { state: 'failed'; task: T }
    | { state: 'timeout' };

interface PollTaskOptions<T extends PollableTask> {
    fetchTask: () => Promise<T>;
    intervalMs?: number;
    maxAttempts?: number;
    signal?: AbortSignal;
    onPollError?: (error: unknown) => void;
}

const createAbortError = () => {
    const error = new Error('Polling cancelled.');
    error.name = 'AbortError';
    return error;
};

const waitForNextAttempt = (delayMs: number, signal?: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
        if (signal?.aborted) {
            reject(createAbortError());
            return;
        }

        const timeoutId = setTimeout(() => {
            signal?.removeEventListener('abort', handleAbort);
            resolve();
        }, delayMs);

        const handleAbort = () => {
            clearTimeout(timeoutId);
            reject(createAbortError());
        };

        signal?.addEventListener('abort', handleAbort, { once: true });
    });

export const pollTaskUntilTerminal = async <T extends PollableTask>({
    fetchTask,
    intervalMs = 2000,
    maxAttempts = 90,
    signal,
    onPollError,
}: PollTaskOptions<T>): Promise<TaskPollingResult<T>> => {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        if (signal?.aborted) throw createAbortError();

        try {
            const task = await fetchTask();
            if (task.status === 'completed') return { state: 'completed', task };
            if (task.status === 'failed') return { state: 'failed', task };
        } catch (error) {
            onPollError?.(error);
        }

        if (attempt < maxAttempts) {
            await waitForNextAttempt(intervalMs, signal);
        }
    }

    return { state: 'timeout' };
};

