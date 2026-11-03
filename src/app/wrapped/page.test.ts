import WrappedIndexPage, { dynamic } from './page';

jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

describe('/wrapped', () => {
  afterEach(() => jest.useRealTimers());

  it('is rendered per request, not prerendered', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('redirects to the current UTC month', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-12-31T23:30:00Z'));
    expect(() => WrappedIndexPage()).toThrow('REDIRECT:/wrapped/2026-12');
    jest.setSystemTime(new Date('2027-01-01T00:30:00Z'));
    expect(() => WrappedIndexPage()).toThrow('REDIRECT:/wrapped/2027-01');
  });
});
