import { describe, expect, it } from 'vitest';
import { languageOfCountry } from '@/i18n';
import worker from '../../worker';
import { withCountry } from '../../worker/country';

const PAGE = '<!doctype html>\n<html lang="en">\n  <head></head>\n</html>\n';

const html = (body = PAGE) =>
  new Response(body, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', ETag: '"abc"', 'Content-Length': '60' },
  });

describe('first visit language from the country', () => {
  it('maps countries to the four languages, English by default', () => {
    expect(languageOfCountry('FR')).toBe('fr');
    expect(languageOfCountry('BE')).toBe('fr');
    expect(languageOfCountry('CH')).toBe('de');
    expect(languageOfCountry('AT')).toBe('de');
    expect(languageOfCountry('MX')).toBe('es');
    expect(languageOfCountry('US')).toBe('en');
    expect(languageOfCountry('IS')).toBe('en');
    expect(languageOfCountry(undefined)).toBe('en');
  });

  it('puts the country on the root page, and nothing else', async () => {
    const page = await withCountry(html(), 'DE');
    expect(await page.text()).toContain('<html lang="en" data-country="DE">');
    expect(page.headers.get('ETag')).toBeNull();
    expect(page.headers.get('Content-Length')).toBeNull();
    // Unknown or odd countries, and files that are not HTML, pass through untouched.
    const unknown = html();
    expect(await withCountry(unknown, undefined)).toBe(unknown);
    const odd = html();
    expect(await withCountry(odd, '"><script>')).toBe(odd);
    const css = new Response('a{}', { headers: { 'Content-Type': 'text/css' } });
    expect(await withCountry(css, 'DE')).toBe(css);
  });

  it('is applied by the Worker to / only', async () => {
    const env = {
      GITHUB_REPO: '',
      GITHUB_TOKEN: '',
      ASSETS: { fetch: () => Promise.resolve(html()) },
    };
    const visit = (path: string) => {
      const request = new Request(`https://grafcet.org${path}`);
      Object.defineProperty(request, 'cf', { value: { country: 'ES' } });
      return worker.fetch(request, env as never);
    };
    expect(await (await visit('/')).text()).toContain('data-country="ES"');
    expect(await (await visit('/es/')).text()).not.toContain('data-country');
  });
});
