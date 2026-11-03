import { filtersEqual, parseFilters, serializeFilters, EMPTY_URL_FILTERS } from './filterUrl';
import { backendTypeFor } from './eventQuery';

const parse = (qs: string) => parseFilters(new URLSearchParams(qs));

describe('parseFilters', () => {
  it('reads all four filters', () => {
    expect(parse('service=github&category=issues&repo=heimdall&q=fix%20bug')).toEqual({
      service: 'github',
      category: 'issues',
      repo: 'heimdall',
      search: 'fix bug',
    });
  });

  it('returns empty filters for a bare URL', () => {
    expect(parse('')).toEqual(EMPTY_URL_FILTERS);
  });

  it('drops unknown services and categories', () => {
    const f = parse('service=bitbucket&category=gossip');
    expect(f.service).toBeNull();
    expect(f.category).toBeNull();
  });

  it('is case-insensitive for ids and trims text', () => {
    const f = parse('service=GitHub&q=%20%20hello%20');
    expect(f.service).toBe('github');
    expect(f.search).toBe('hello');
  });

  it('caps text length', () => {
    expect(parse(`q=${'a'.repeat(500)}`).search).toHaveLength(200);
  });
});

describe('serializeFilters', () => {
  it('writes only the filters that are set', () => {
    const params = serializeFilters({ service: 'vercel', category: null, repo: '', search: 'x y' });
    expect(params.toString()).toBe('service=vercel&q=x+y');
  });

  it('produces an empty query for the default view', () => {
    expect(serializeFilters(EMPTY_URL_FILTERS).toString()).toBe('');
  });

  it('keeps unrelated params and replaces stale filter params', () => {
    const base = new URLSearchParams('debug=1&service=github&q=old');
    const params = serializeFilters({ ...EMPTY_URL_FILTERS, category: 'security' }, base);
    expect(params.get('debug')).toBe('1');
    expect(params.get('category')).toBe('security');
    expect(params.has('service')).toBe(false);
    expect(params.has('q')).toBe(false);
  });

  it('does not change the params it was given', () => {
    const base = new URLSearchParams('q=old');
    serializeFilters(EMPTY_URL_FILTERS, base);
    expect(base.get('q')).toBe('old');
  });

  it('round-trips through parseFilters', () => {
    const filters = { service: 'railway', category: 'deployments', repo: 'a/b', search: 'x&y=z' };
    expect(parseFilters(serializeFilters(filters))).toEqual(filters);
  });
});

describe('filtersEqual', () => {
  it('compares every field', () => {
    expect(filtersEqual(EMPTY_URL_FILTERS, { ...EMPTY_URL_FILTERS })).toBe(true);
    expect(filtersEqual(EMPTY_URL_FILTERS, { ...EMPTY_URL_FILTERS, repo: 'x' })).toBe(false);
  });
});

describe('backendTypeFor', () => {
  it('maps a service with one event type to that type', () => {
    expect(backendTypeFor({ selectedService: 'vercel', selectedCategory: null })).toBe(
      'vercel.deploy'
    );
    expect(backendTypeFor({ selectedService: 'railway', selectedCategory: null })).toBe(
      'railway.deploy'
    );
  });

  it('combines service and category when that leaves one type', () => {
    expect(backendTypeFor({ selectedService: 'github', selectedCategory: 'issues' })).toBe(
      'github.issue'
    );
  });

  it('returns null when several types match or nothing is selected', () => {
    expect(backendTypeFor({ selectedService: 'github', selectedCategory: null })).toBeNull();
    expect(backendTypeFor({ selectedService: null, selectedCategory: 'issues' })).toBeNull();
    expect(backendTypeFor({ selectedService: null, selectedCategory: null })).toBeNull();
  });
});
