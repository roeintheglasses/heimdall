import { safeUrl } from './safeUrl';

describe('safeUrl', () => {
  it('allows provider hosts and subdomains', () => {
    expect(safeUrl('https://github.com/a/b')).toBe('https://github.com/a/b');
    expect(safeUrl('https://my-app-git-x.vercel.app/')).toBe('https://my-app-git-x.vercel.app/');
    expect(safeUrl('https://railway.com/project/1')).not.toBeNull();
    expect(safeUrl('http://www.github.com/a')).not.toBeNull();
  });

  it('rejects dangerous schemes', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('data:text/html,hi')).toBeNull();
  });

  it('rejects other hosts and lookalikes', () => {
    expect(safeUrl('https://evil.com')).toBeNull();
    expect(safeUrl('https://github.com.evil.com/x')).toBeNull();
    expect(safeUrl('https://evilgithub.com')).toBeNull();
    expect(safeUrl('https://github.com@evil.com/')).toBeNull();
  });

  it('rejects non-strings and junk', () => {
    expect(safeUrl(undefined)).toBeNull();
    expect(safeUrl(42)).toBeNull();
    expect(safeUrl('not a url')).toBeNull();
    expect(safeUrl('')).toBeNull();
  });
});
