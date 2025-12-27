import {
  classifyEvent,
  getCategoryById,
  extractService,
  getServiceById,
  getCategoryColorClasses,
  DEFAULT_CATEGORIES,
  DEFAULT_SERVICES,
  EVENT_TYPE_CATEGORY_MAP,
} from './categories';

describe('classifyEvent', () => {
  describe('direct mapping', () => {
    it.each(Object.entries(EVENT_TYPE_CATEGORY_MAP))(
      'should classify %s as %s',
      (eventType, expectedCategory) => {
        expect(classifyEvent(eventType)).toBe(expectedCategory);
      }
    );
  });

  describe('fallback pattern matching', () => {
    it('should classify unknown github events as development', () => {
      expect(classifyEvent('github.unknown')).toBe('development');
      expect(classifyEvent('github.workflow')).toBe('development');
    });

    it('should classify unknown vercel events as deployments', () => {
      expect(classifyEvent('vercel.unknown')).toBe('deployments');
      expect(classifyEvent('vercel.build')).toBe('deployments');
    });

    it('should classify unknown railway events as deployments', () => {
      expect(classifyEvent('railway.unknown')).toBe('deployments');
      expect(classifyEvent('railway.build')).toBe('deployments');
    });

    it('should classify unknown error events as issues', () => {
      expect(classifyEvent('error.unknown')).toBe('issues');
      expect(classifyEvent('error.runtime')).toBe('issues');
    });

    it('should classify unknown security events as security', () => {
      expect(classifyEvent('security.unknown')).toBe('security');
      expect(classifyEvent('security.breach')).toBe('security');
    });

    it('should classify unknown monitoring events as infrastructure', () => {
      expect(classifyEvent('monitoring.unknown')).toBe('infrastructure');
      expect(classifyEvent('monitoring.cpu')).toBe('infrastructure');
    });
  });

  describe('default fallback', () => {
    it('should default to development for completely unknown types', () => {
      expect(classifyEvent('unknown.event')).toBe('development');
      expect(classifyEvent('custom.type')).toBe('development');
      expect(classifyEvent('')).toBe('development');
    });
  });
});

describe('getCategoryById', () => {
  it('should return category for valid ID', () => {
    const category = getCategoryById('development');
    expect(category).toBeDefined();
    expect(category?.name).toBe('Development');
    expect(category?.icon).toBe('GitBranch');
  });

  it('should return undefined for invalid ID', () => {
    expect(getCategoryById('invalid')).toBeUndefined();
    expect(getCategoryById('')).toBeUndefined();
  });

  it('should return correct category for each default category', () => {
    DEFAULT_CATEGORIES.forEach((cat) => {
      const found = getCategoryById(cat.id);
      expect(found).toEqual(cat);
    });
  });
});

describe('extractService', () => {
  it('should extract github service', () => {
    expect(extractService('github.push')).toBe('github');
    expect(extractService('github.pr')).toBe('github');
    expect(extractService('github.issue')).toBe('github');
  });

  it('should extract vercel service', () => {
    expect(extractService('vercel.deploy')).toBe('vercel');
    expect(extractService('vercel.build')).toBe('vercel');
  });

  it('should extract railway service', () => {
    expect(extractService('railway.deploy')).toBe('railway');
    expect(extractService('railway.restart')).toBe('railway');
  });

  it('should extract monitoring service', () => {
    expect(extractService('monitoring.alert')).toBe('monitoring');
    expect(extractService('monitoring.performance')).toBe('monitoring');
  });

  it('should extract security service', () => {
    expect(extractService('security.vulnerability')).toBe('security');
    expect(extractService('security.audit')).toBe('security');
  });

  it('should return prefix for unmatched types', () => {
    expect(extractService('custom.event')).toBe('custom');
    expect(extractService('unknown.type')).toBe('unknown');
  });

  it('should return "other" for empty or invalid types', () => {
    expect(extractService('')).toBe('other');
  });
});

describe('getServiceById', () => {
  it('should return service for valid ID', () => {
    const service = getServiceById('github');
    expect(service).toBeDefined();
    expect(service?.name).toBe('GitHub');
    expect(service?.pattern).toBe('^github\\.');
  });

  it('should return undefined for invalid ID', () => {
    expect(getServiceById('invalid')).toBeUndefined();
    expect(getServiceById('')).toBeUndefined();
  });

  it('should return correct service for each default service', () => {
    DEFAULT_SERVICES.forEach((svc) => {
      const found = getServiceById(svc.id);
      expect(found).toEqual(svc);
    });
  });
});

describe('getCategoryColorClasses', () => {
  it('should return correct classes for blue', () => {
    const classes = getCategoryColorClasses('blue');
    expect(classes.bg).toContain('bg-blue-50');
    expect(classes.text).toContain('text-blue-600');
    expect(classes.border).toContain('border-blue-200');
    expect(classes.badge).toContain('bg-blue-100');
  });

  it('should return correct classes for each default color', () => {
    const colors = [
      'blue',
      'green',
      'purple',
      'red',
      'orange',
      'slate',
      'emerald',
      'violet',
      'amber',
    ];
    colors.forEach((color) => {
      const classes = getCategoryColorClasses(color);
      expect(classes.bg).toContain(`bg-${color}-50`);
      expect(classes.text).toContain(`text-${color}-600`);
    });
  });

  it('should fallback to blue for unknown colors', () => {
    const classes = getCategoryColorClasses('unknown');
    expect(classes.bg).toContain('bg-blue-50');
    expect(classes.text).toContain('text-blue-600');
  });
});

describe('DEFAULT_CATEGORIES', () => {
  it('should have all required categories', () => {
    const categoryIds = DEFAULT_CATEGORIES.map((c) => c.id);
    expect(categoryIds).toContain('development');
    expect(categoryIds).toContain('deployments');
    expect(categoryIds).toContain('infrastructure');
    expect(categoryIds).toContain('issues');
    expect(categoryIds).toContain('security');
  });

  it('should have valid priority order', () => {
    const priorities = DEFAULT_CATEGORIES.map((c) => c.priority);
    const sortedPriorities = [...priorities].sort((a, b) => a - b);
    expect(priorities).toEqual(sortedPriorities);
  });

  it('should have all required fields for each category', () => {
    DEFAULT_CATEGORIES.forEach((cat) => {
      expect(cat.id).toBeDefined();
      expect(cat.name).toBeDefined();
      expect(cat.description).toBeDefined();
      expect(cat.icon).toBeDefined();
      expect(cat.color).toBeDefined();
      expect(cat.priority).toBeGreaterThan(0);
    });
  });
});

describe('DEFAULT_SERVICES', () => {
  it('should have valid regex patterns', () => {
    DEFAULT_SERVICES.forEach((service) => {
      expect(() => new RegExp(service.pattern)).not.toThrow();
    });
  });

  it('should have all required fields for each service', () => {
    DEFAULT_SERVICES.forEach((svc) => {
      expect(svc.id).toBeDefined();
      expect(svc.name).toBeDefined();
      expect(svc.description).toBeDefined();
      expect(svc.icon).toBeDefined();
      expect(svc.color).toBeDefined();
      expect(svc.pattern).toBeDefined();
    });
  });
});
