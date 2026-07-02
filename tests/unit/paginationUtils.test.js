import { encodeCursor, decodeCursor, buildPaginatedResponse, parseLimit } from '../../src/utils/paginationUtils.js';

describe('paginationUtils', () => {
  it('round-trips a cursor through encode/decode', () => {
    const createdAt = new Date().toISOString();
    const id = 'abc-123';
    const cursor = encodeCursor({ createdAt, id });
    const decoded = decodeCursor(cursor);
    expect(decoded).toEqual({ createdAt, id });
  });

  it('returns null for an empty cursor', () => {
    expect(decodeCursor(undefined)).toBeNull();
  });

  it('throws on a malformed cursor', () => {
    expect(() => decodeCursor('not-base64-json')).toThrow();
  });

  it('clamps limit to the maximum allowed', () => {
    expect(parseLimit('9999')).toBe(100);
  });

  it('defaults limit when not provided', () => {
    expect(parseLimit(undefined)).toBe(20);
  });

  it('builds nextCursor only when more rows than the limit were fetched', () => {
    const rows = [
      { id: '1', createdAt: '2024-01-01' },
      { id: '2', createdAt: '2024-01-02' },
      { id: '3', createdAt: '2024-01-03' },
    ];
    const { items, nextCursor } = buildPaginatedResponse(rows, 2);
    expect(items).toHaveLength(2);
    expect(nextCursor).not.toBeNull();
  });

  it('returns a null nextCursor when there is no next page', () => {
    const rows = [{ id: '1', createdAt: '2024-01-01' }];
    const { items, nextCursor } = buildPaginatedResponse(rows, 20);
    expect(items).toHaveLength(1);
    expect(nextCursor).toBeNull();
  });
});
