import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Sparkles, Stethoscope, HeartPulse } from 'lucide-react';
import { ClinicalLoader } from './ClinicalLoader';

describe('ClinicalLoader Component', () => {
  describe('Sizes', () => {
    it('renders sm size properly with compact structure', () => {
      const html = renderToStaticMarkup(
        <ClinicalLoader size="sm" message="Synchronizing..." subtext="Session ID #123" />
      );
      expect(html).toContain('Synchronizing...');
      expect(html).toContain('Session ID #123');
      expect(html).toContain('role="status"');
      expect(html).toContain('inline-flex');
    });

    it('renders md size (default) properly', () => {
      const html = renderToStaticMarkup(
        <ClinicalLoader message="Loading Caseload..." subtext="Connecting to database..." />
      );
      expect(html).toContain('Loading Caseload...');
      expect(html).toContain('Connecting to database...');
      expect(html).toContain('role="status"');
      expect(html).toContain('animate-spin');
    });

    it('renders lg size properly with high-contrast text', () => {
      const html = renderToStaticMarkup(
        <ClinicalLoader size="lg" message="Generating Clinical Note" subtext="Vitalhealth AI Engine" />
      );
      expect(html).toContain('Generating Clinical Note');
      expect(html).toContain('Vitalhealth AI Engine');
      expect(html).toContain('text-base');
    });

    it('renders fullscreen size with backdrop overlay and modal card', () => {
      const html = renderToStaticMarkup(
        <ClinicalLoader
          size="fullscreen"
          message="Securing Session..."
          subtext="HIPAA Audit Log Active"
        />
      );
      expect(html).toContain('fixed inset-0');
      expect(html).toContain('backdrop-blur-md');
      expect(html).toContain('Securing Session...');
      expect(html).toContain('HIPAA Audit Log Active');
      expect(html).toContain('CLIO Engine');
    });
  });

  describe('Variants', () => {
    it('renders spinner variant with rotating border and glowing halo', () => {
      const html = renderToStaticMarkup(
        <ClinicalLoader variant="spinner" message="Analyzing Speech..." />
      );
      expect(html).toContain('animate-spin');
      expect(html).toContain('Analyzing Speech...');
    });

    it('renders pulsing-logo variant with clinical emblem and ripple animations', () => {
      const html = renderToStaticMarkup(
        <ClinicalLoader
          variant="pulsing-logo"
          size="md"
          message="Synchronizing Core"
          subtext="Ready"
        />
      );
      expect(html).toContain('animate-ping');
      expect(html).toContain('Synchronizing Core');
      expect(html).toContain('Ready');
    });

    it('renders skeleton variant with document placeholders', () => {
      const html = renderToStaticMarkup(
        <ClinicalLoader
          variant="skeleton"
          message="Loading Clinical Note Skeleton..."
          subtext="Rendering layout"
        />
      );
      expect(html).toContain('animate-pulse');
      expect(html).toContain('Loading Clinical Note Skeleton...');
      expect(html).toContain('Rendering layout');
    });

    it('renders card-skeleton variant with multi-card grid placeholders', () => {
      const html = renderToStaticMarkup(
        <ClinicalLoader
          variant="card-skeleton"
          message="Fetching Blueprints..."
          subtext="3 Templates found"
        />
      );
      expect(html).toContain('Fetching Blueprints...');
      expect(html).toContain('3 Templates found');
      expect(html).toContain('grid-cols-1');
      expect(html).toContain('animate-pulse');
    });
  });

  describe('Customization & Properties', () => {
    it('renders custom icon when provided', () => {
      const html = renderToStaticMarkup(
        <ClinicalLoader
          icon={Sparkles}
          message="AI Processing"
        />
      );
      expect(html).toContain('AI Processing');
      // SVG tag should be present
      expect(html).toContain('<svg');
    });

    it('applies custom className and fullHeight correctly', () => {
      const html = renderToStaticMarkup(
        <ClinicalLoader
          className="custom-clinical-loader-class"
          fullHeight
          message="Testing..."
        />
      );
      expect(html).toContain('custom-clinical-loader-class');
      expect(html).toContain('min-h-[300px]');
    });

    it('supports custom Stethoscope icon on pulsing-logo variant', () => {
      const html = renderToStaticMarkup(
        <ClinicalLoader
          variant="pulsing-logo"
          icon={Stethoscope}
          size="lg"
          message="TCM Assessment"
        />
      );
      expect(html).toContain('TCM Assessment');
      expect(html).toContain('<svg');
    });
  });
});
