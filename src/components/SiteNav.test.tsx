import { render, screen } from '@testing-library/react';
import SiteNav from './SiteNav';

describe('SiteNav', () => {
  it('links to the dashboard, stats and the current wrapped month', () => {
    render(<SiteNav current="dashboard" />);
    const now = new Date();
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Stats' })).toHaveAttribute('href', '/me');
    expect(screen.getByRole('link', { name: 'Wrapped' })).toHaveAttribute(
      'href',
      `/wrapped/${month}`
    );
  });

  it('marks only the current page with aria-current', () => {
    render(<SiteNav current="stats" />);
    expect(screen.getByRole('link', { name: 'Stats' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Wrapped' })).not.toHaveAttribute('aria-current');
  });

  it('puts no button inside a link', () => {
    const { container } = render(<SiteNav current="wrapped" />);
    expect(container.querySelector('a button')).toBeNull();
  });
});
