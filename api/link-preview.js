import { lookup } from 'node:dns/promises';
import { Buffer } from 'node:buffer';
import { isIP } from 'node:net';
import http from 'node:http';
import https from 'node:https';

const MAX_URL_LENGTH = 2048;
const MAX_HTML_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT_MS = 6000;
const PRIVATE_IPV4_RANGES = [
  [0x00000000, 8],
  [0x0a000000, 8],
  [0x64400000, 10],
  [0x7f000000, 8],
  [0xa9fe0000, 16],
  [0xac100000, 12],
  [0xc0000000, 24],
  [0xc0000200, 24],
  [0xc0586300, 24],
  [0xc0a80000, 16],
  [0xc6120000, 15],
  [0xc6336400, 24],
  [0xcb007100, 24],
  [0xe0000000, 4],
  [0xf0000000, 4],
];

function isPublicAddress(address) {
  const family = isIP(address);
  if (family === 4) {
    const octets = address.split('.').map(Number);
    const value = octets.reduce((result, octet) => (result * 256) + octet, 0) >>> 0;
    return !PRIVATE_IPV4_RANGES.some(([network, prefix]) => (
      (value >>> (32 - prefix)) === (network >>> (32 - prefix))
    ));
  }

  if (family !== 6) return false;
  const halves = address.toLowerCase().split('::');
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  const zeroCount = 8 - left.length - right.length;
  if (zeroCount < 0) return false;
  const segments = [
    ...left,
    ...Array(zeroCount).fill('0'),
    ...right,
  ].map((segment) => Number.parseInt(segment || '0', 16));
  if (segments.length !== 8 || segments.some((segment) => !Number.isFinite(segment))) return false;

  const value = segments.reduce((result, segment) => (result << 16n) | BigInt(segment), 0n);
  const globalUnicast = (value >> 125n) === 1n;
  const documentation = (value >> 96n) === 0x20010db8n;
  const teredo = (value >> 96n) === 0x20010000n;
  const sixToFour = (value >> 112n) === 0x2002n;
  return globalUnicast && !documentation && !teredo && !sixToFour;
}

async function resolvePublicHost(hostname) {
  const normalizedHost = hostname.toLowerCase().replace(/\.$/, '');
  if (
    !normalizedHost
    || normalizedHost === 'localhost'
    || normalizedHost.endsWith('.localhost')
    || normalizedHost.endsWith('.local')
    || normalizedHost.endsWith('.internal')
    || isIP(normalizedHost)
  ) {
    throw new Error('Only public web addresses can be previewed.');
  }

  const addresses = await lookup(normalizedHost, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error('The link does not resolve to a public address.');
  }
  return addresses[0];
}

async function validateUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('A valid URL is required.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Only public HTTP and HTTPS links can be previewed.');
  }
  const address = await resolvePublicHost(url.hostname);
  return { url, address };
}

function requestHtml(url, address) {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const request = transport.request(url, {
      method: 'GET',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Encoding': 'identity',
        'User-Agent': 'RoomSplitLinkPreview/1.0',
        Range: `bytes=0-${MAX_HTML_BYTES - 1}`,
      },
      lookup: (hostname, options, callback) => {
        if (hostname.toLowerCase() !== url.hostname.toLowerCase()) {
          callback(new Error('Unexpected hostname during link preview request.'));
          return;
        }
        if (options?.all) callback(null, [address]);
        else callback(null, address.address, address.family);
      },
    }, (response) => {
      const location = response.headers.location;
      if (response.statusCode >= 300 && response.statusCode < 400 && location) {
        response.resume();
        resolve({ redirect: location });
        return;
      }
      const contentType = response.headers['content-type'] || '';
      if (response.statusCode !== 200 && response.statusCode !== 206) {
        response.resume();
        reject(new Error(`The link server returned ${response.statusCode}.`));
        return;
      }
      if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) {
        response.resume();
        reject(new Error('The link does not serve an HTML page.'));
        return;
      }

      const chunks = [];
      let size = 0;
      response.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_HTML_BYTES) {
          request.destroy(new Error('The link page is too large to preview.'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve({ html: Buffer.concat(chunks).toString('utf8') }));
      response.on('error', reject);
    });
    request.setTimeout(REQUEST_TIMEOUT_MS, () => request.destroy(new Error('Link preview request timed out.')));
    request.on('error', reject);
    request.end();
  });
}

async function fetchPage(url, redirects = 0) {
  const { address } = await validateUrl(url.href);
  const result = await requestHtml(url, address);
  if (!result.redirect) return { html: result.html, url };
  if (redirects >= MAX_REDIRECTS) throw new Error('The link redirected too many times.');
  const nextUrl = new URL(result.redirect, url);
  return fetchPage(nextUrl, redirects + 1);
}

function decodeHtml(value) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([a-f\d]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

function getMetaTags(html) {
  const values = new Map();
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  tags.forEach((tag) => {
    const attributes = new Map();
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
      attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? '');
    }
    const key = (attributes.get('property') || attributes.get('name') || '').toLowerCase();
    const content = attributes.get('content');
    if (key && content && !values.has(key)) values.set(key, decodeHtml(content));
  });
  return values;
}

async function parsePreview(html, pageUrl) {
  const tags = getMetaTags(html);
  const titleTag = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
  const title = tags.get('og:title') || tags.get('twitter:title') || decodeHtml(titleTag);
  const description = tags.get('og:description')
    || tags.get('twitter:description')
    || tags.get('description')
    || '';
  const imageValue = tags.get('og:image') || tags.get('og:image:url') || tags.get('twitter:image') || '';
  let image = '';
  if (imageValue) {
    try {
      const imageUrl = new URL(imageValue, pageUrl);
      if (['http:', 'https:'].includes(imageUrl.protocol) && !imageUrl.username && !imageUrl.password) {
        await validateUrl(imageUrl.href);
        image = imageUrl.href;
      }
    } catch {
      image = '';
    }
  }
  return {
    url: pageUrl.href,
    title: title.slice(0, 200),
    description: description.slice(0, 360),
    siteName: (tags.get('og:site_name') || '').slice(0, 100),
    image,
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestedUrl = Array.isArray(req.query?.url) ? req.query.url[0] : req.query?.url;
  if (typeof requestedUrl !== 'string' || requestedUrl.length > MAX_URL_LENGTH) {
    return res.status(400).json({ error: 'A valid URL is required.' });
  }

  try {
    const page = await fetchPage(new URL(requestedUrl));
    return res.status(200).json(await parsePreview(page.html, page.url));
  } catch (error) {
    console.error('Link preview request failed:', error);
    return res.status(422).json({ error: 'A preview is not available for this link.' });
  }
}
