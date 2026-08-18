import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Templates from './Templates';

// Mock dependencies
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user', email: 'test@example.com' },
    loading: false
  }))
}));

vi.mock('../lib/storage', () => ({
  storage: {
    getActiveTemplateId: vi.fn(() => 'psych-eval'),
    setActiveTemplateId: vi.fn(),
    getTemplates: vi.fn(async () => [
      {
        id: 'psych-eval',
        name: 'Psychiatric Evaluation',
        version: '2.0.0',
        category: 'Psychiatry',
        content: 'Extraction prompt for psychiatric assessment...',
        definition: '[]',
        is_public: true
      },
      {
        id: 'custom-template-1',
        name: 'Custom Progress Blueprint',
        version: '1.0.0',
        category: 'Custom',
        content: 'Prompt for custom blueprint...',
        definition: '[]',
        is_public: false
      }
    ]),
    saveTemplate: vi.fn(),
    saveTemplates: vi.fn(),
    deleteTemplate: vi.fn()
  }
}));

describe('Templates Page Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const html = renderToStaticMarkup(<Templates />);
    expect(html).toBeDefined();
    expect(typeof html).toBe('string');
  });

  it('renders clinical loader when in loading state initially or during bootstrap', () => {
    const html = renderToStaticMarkup(<Templates />);
    expect(html).toContain('Synchronizing Blueprints...');
  });
});
