/**
 * The site's root page with the visitor's country (Cloudflare's `request.cf.country`) on
 * `<html data-country>`, from which the app picks the language of a first visit. Nothing is
 * stored or sent anywhere; the language pages (<lang>/) and every other file are served as they
 * are, and installs without this Worker start in English.
 */
export async function withCountry(response: Response, country: unknown): Promise<Response> {
  if (typeof country !== 'string' || !/^[A-Z0-9]{2}$/.test(country)) return response;
  if (!response.headers.get('Content-Type')?.startsWith('text/html')) return response;
  const html = (await response.text()).replace(
    '<html lang="en">',
    `<html lang="en" data-country="${country}">`,
  );
  const headers = new Headers(response.headers);
  // The body now depends on the visitor: no length or validator of the file on disk.
  headers.delete('Content-Length');
  headers.delete('ETag');
  return new Response(html, { status: response.status, headers });
}
