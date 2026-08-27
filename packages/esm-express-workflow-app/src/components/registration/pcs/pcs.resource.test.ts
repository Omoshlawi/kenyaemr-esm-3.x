import { describe, expect, it } from 'vitest';
import { buildParticipantSearchUrl, hasAnyFilter } from './pcs.resource';
import { searchMockParticipants } from './pcs-mock-data';

const url = (filters: Partial<{ name: string; village: string; phone: string }>, opts = {}) =>
  buildParticipantSearchUrl({ name: '', village: '', phone: '', ...filters }, opts)!;

/**
 * Pins the `pbids-participants` contract while the module is undeployed. The URL-building
 * cases test production code and outlive the mock; the ones exercising
 * `searchMockParticipants` go when `pcs-mock-data.ts` does.
 */
describe('pbids participant search contract', () => {
  it('omits blank filters and holds an unfiltered request', () => {
    expect(hasAnyFilter({ name: '  ', village: '', phone: '' })).toBe(false);
    expect(buildParticipantSearchUrl({ name: '', village: '', phone: '' })).toBeNull();
    expect(url({ name: 'Mary Akinyi' })).toContain(
      '/pbids-participants?name=Mary+Akinyi&limit=50&startIndex=0&fuzzy=true',
    );
    expect(url({ name: 'a', village: 'KAMBI' })).toContain('village=KAMBI');
    expect(url({ name: 'a' })).not.toContain('village=');
  });

  it('rejects a request with no filter, like the API 400', () => {
    expect(() => searchMockParticipants('/ws/rest/v1/pbids-participants?limit=50')).toThrow();
  });

  it('nulls matchType/matchedOn when name was not supplied', () => {
    const res = searchMockParticipants(url({ village: 'KAMBI' }));
    expect(res.results.length).toBeGreaterThan(0);
    expect(res.results.every((r) => r.matchType === null && r.matchedOn === null)).toBe(true);
  });

  it('reports EXACT on name and ranks it first', () => {
    const res = searchMockParticipants(url({ name: 'DENNIS OMONDI ODONGO' }));
    expect(res.results[0].matchType).toBe('EXACT');
    expect(res.results[0].matchedOn).toBe('name');
    expect(['EXACT', 'CONTAINS', 'SOUNDEX']).toContain(res.results[res.results.length - 1].matchType);
  });

  it('drops the phonetic tier when fuzzy=false', () => {
    const fuzzy = searchMockParticipants(url({ name: 'ODONGO' }, { fuzzy: true }));
    const strict = searchMockParticipants(url({ name: 'ODONGO' }, { fuzzy: false }));
    expect(strict.totalCount).toBeLessThanOrEqual(fuzzy.totalCount);
    expect(strict.results.every((r) => r.matchType !== 'SOUNDEX')).toBe(true);
  });

  it('matches phone on digits only, however it is formatted', () => {
    const any = searchMockParticipants(url({ village: 'KAMBI' }));
    const phone = any.results.find((r) => r.contacts[0]?.phone)!.contacts[0].phone!;
    const digits = phone.replace(/\D/g, '').slice(-9);
    for (const variant of [phone, `+254${digits}`, `254${digits}`, digits]) {
      expect(searchMockParticipants(url({ phone: variant })).totalCount).toBeGreaterThan(0);
    }
  });

  it('AND-combines filters', () => {
    const wide = searchMockParticipants(url({ name: 'ODONGO' }));
    const narrow = searchMockParticipants(url({ name: 'ODONGO', village: 'KAMBI' }));
    expect(narrow.totalCount).toBeLessThan(wide.totalCount);
    expect(narrow.results.every((r) => r.village.name.includes('KAMBI'))).toBe(true);
  });

  it('pages with limit/startIndex while totalCount counts the whole match set', () => {
    const page = searchMockParticipants(url({ name: 'ODONGO' }, { limit: 3, startIndex: 0 }));
    expect(page.results).toHaveLength(3);
    expect(page.totalCount).toBeGreaterThan(3);
    const next = searchMockParticipants(url({ name: 'ODONGO' }, { limit: 3, startIndex: 3 }));
    expect(next.startIndex).toBe(3);
    expect(next.results[0].individualId).not.toBe(page.results[0].individualId);
  });

  it('caps limit at 200', () => {
    const res = searchMockParticipants(url({ name: 'ODONGO' }, { limit: 5000 }));
    expect(res.results.length).toBeLessThanOrEqual(200);
  });
});
