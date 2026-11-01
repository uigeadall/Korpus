import { describe, expect, it } from 'vitest';
import {
  EXAMPLE_PROJECT,
  PROJECTS,
  SCOPE_LABELS,
  findProject,
  formatCompleted,
  hasPublishedProjects,
  projectSlugs,
  publishedProjects,
} from './portfolio';

const ALL = [...PROJECTS, EXAMPLE_PROJECT];

describe('месец на завършване', () => {
  it('се чете на български', () => {
    expect(formatCompleted('2026-03')).toBe('март 2026');
    expect(formatCompleted('2025-12')).toBe('декември 2025');
  });

  it('не пречупва странен вход', () => {
    expect(formatCompleted('скоро')).toBe('скоро');
    expect(formatCompleted('2026-13')).toBe('2026-13');
  });
});

describe('записите на проектите', () => {
  it('имат адрес с малки букви, цифри и тирета', () => {
    for (const p of ALL) {
      expect(p.slug, p.title).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('нямат два еднакви адреса', () => {
    const slugs = projectSlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('имат месец на завършване във формат ГГГГ-ММ', () => {
    for (const p of ALL) {
      expect(p.completed, p.title).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
    }
  });

  it('имат познат вид обзавеждане', () => {
    for (const p of ALL) {
      expect(SCOPE_LABELS[p.scope], p.title).toBeTruthy();
    }
  });

  it('имат описание, параметри и материали', () => {
    for (const p of ALL) {
      expect(p.body.length, p.title).toBeGreaterThan(0);
      expect(p.facts.length, p.title).toBeGreaterThan(0);
      expect(p.materials.length, p.title).toBeGreaterThan(0);
    }
  });

  it('имат поне един кадър и текст за екранни четци на всеки', () => {
    for (const p of ALL) {
      expect(p.images.length, p.title).toBeGreaterThan(0);
      for (const img of p.images) {
        expect(img.alt.trim().length, `${p.title}: alt`).toBeGreaterThan(0);
      }
    }
  });
});

describe('публичната галерия', () => {
  it('не показва примерния запис', () => {
    expect(publishedProjects()).not.toContain(EXAMPLE_PROJECT);
    expect(publishedProjects().every((p) => !p.example)).toBe(true);
  });

  it('подрежда най-новия проект отпред', () => {
    const months = publishedProjects().map((p) => p.completed);
    expect([...months].sort((a, b) => b.localeCompare(a))).toEqual(months);
  });

  it('казва, когато още няма с какво да се напълни', () => {
    expect(hasPublishedProjects()).toBe(publishedProjects().length > 0);
  });
});

describe('търсене по адрес', () => {
  it('намира примерния запис — той има своя страница', () => {
    expect(findProject(EXAMPLE_PROJECT.slug)).toBe(EXAMPLE_PROJECT);
  });

  it('намира всеки адрес, който страницата обслужва', () => {
    for (const slug of projectSlugs()) {
      expect(findProject(slug), slug).toBeDefined();
    }
  });

  it('връща нищо за непознат адрес', () => {
    expect(findProject('nyama-takuv')).toBeUndefined();
  });
});
