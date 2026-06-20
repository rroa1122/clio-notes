export const normalizeKey = (s: string) =>
    s.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/[&]/g, 'and')
        .trim()
        .replace(/\s+/g, '_');


