import { displayTitle, eventNoun, eventTypeLabel } from './eventDisplay';

describe('displayTitle', () => {
  it('drops the repository prefix for private events', () => {
    expect(displayTitle({ title: 'Private repository: 3 commits pushed', private: true })).toBe(
      '3 commits pushed'
    );
  });

  it('drops the project prefix and capitalises the rest', () => {
    expect(displayTitle({ title: 'Private project: deployment READY', private: true })).toBe(
      'Deployment READY'
    );
    expect(displayTitle({ title: 'Private repository: pull request opened', private: true })).toBe(
      'Pull request opened'
    );
  });

  it('is case-insensitive about the prefix', () => {
    expect(displayTitle({ title: 'private repository: commits pushed', private: true })).toBe(
      'Commits pushed'
    );
  });

  it('leaves public titles alone, even if they start with the same words', () => {
    const title = 'Private repository: how I named it';
    expect(displayTitle({ title, private: false })).toBe(title);
    expect(displayTitle({ title })).toBe(title);
  });

  it('leaves private titles without a prefix alone', () => {
    expect(displayTitle({ title: 'Private event', private: true })).toBe('Private event');
  });

  it('never returns an empty title', () => {
    expect(displayTitle({ title: 'Private repository: ', private: true })).toBe(
      'Private repository: '
    );
  });
});

describe('labels', () => {
  it('names event types for badges and announcements', () => {
    expect(eventTypeLabel('error.ci')).toBe('CI FAILED');
    expect(eventNoun('github.push')).toBe('push');
    expect(eventNoun('github.push', 3)).toBe('pushes');
    expect(eventNoun('vercel.deploy', 2)).toBe('deploys');
    expect(eventNoun('monitoring.alert')).toBe('alert');
  });
});
