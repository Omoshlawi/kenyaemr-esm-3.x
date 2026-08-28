import { describe, expect, it } from 'vitest';
import { buildParticipantSearchUrl, hasAnyFilter } from './pcs.resource';

const url = (filters: Partial<{ name: string; village: string; phone: string; motherId: string }>, opts = {}) =>
  buildParticipantSearchUrl({ name: '', village: '', phone: '', ...filters }, opts)!;

/**
 * Pins the request we send to `pbids-participants`. The module owns the response semantics —
 * name tiering, phone normalisation, AND-combination, paging — and the cases that covered
 * those went with the mock that used to stand in for it.
 */
describe('pbids participant search request', () => {
  it('omits blank filters and holds an unfiltered request', () => {
    // The API rejects an unfiltered request with a 400, so a null URL holds the SWR fetch.
    expect(hasAnyFilter({ name: '  ', village: '', phone: '' })).toBe(false);
    expect(buildParticipantSearchUrl({ name: '', village: '', phone: '' })).toBeNull();
    expect(url({ name: 'Mary Akinyi' })).toContain(
      '/pbids-participants?name=Mary+Akinyi&limit=50&startIndex=0&fuzzy=true',
    );
    expect(url({ name: 'a', village: 'KAMBI' })).toContain('village=KAMBI');
    expect(url({ name: 'a' })).not.toContain('village=');
  });

  it('treats motherId as a filter in its own right', () => {
    expect(hasAnyFilter({ name: '', village: '', phone: '', motherId: '901-1-1-2' })).toBe(true);
    expect(url({ motherId: '901-1-1-2' })).toContain('motherId=901-1-1-2');
  });

  it('passes limit, startIndex and fuzzy through', () => {
    const paged = url({ name: 'ODONGO' }, { limit: 3, startIndex: 6, fuzzy: false });

    expect(paged).toContain('limit=3');
    expect(paged).toContain('startIndex=6');
    expect(paged).toContain('fuzzy=false');
  });
});
