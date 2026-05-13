interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * caniuse MCP — browser feature support tables
 *
 * Auth: none. Loads the upstream `data.json` from Fyrd/caniuse (released
 * under CC-BY 4.0) and caches it per worker isolate for 24 hours.
 */


const DATA_URL = 'https://raw.githubusercontent.com/Fyrd/caniuse/main/data.json';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CIUStat {
  // Map of "version" → support string
  [version: string]: string;
}

interface CIUFeature {
  title: string;
  description?: string;
  status?: string;
  categories?: string[];
  stats?: Record<string, CIUStat>;
  notes?: string;
  bugs?: { description?: string }[];
  links?: { url: string; title: string }[];
  ucprefix?: boolean;
  spec?: string;
  parent?: string;
  keywords?: string;
}

interface CIUData {
  agents: Record<
    string,
    {
      browser: string;
      long_name?: string;
      usage_global?: Record<string, number>;
      // Newer schema: plain version-string array; future / unreleased versions are nulls at the end.
      versions?: (string | null)[];
    }
  >;
  data: Record<string, CIUFeature>;
}

let CACHE: { data: CIUData; expires_at: number } | null = null;

const tools: McpToolExport['tools'] = [
  {
    name: 'feature',
    description: 'Full caniuse record for a feature id (e.g. "css-grid", "fetch", "webp").',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    },
  },
  {
    name: 'search',
    description: 'Search features by title / keyword.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number', description: '1-50 (default 10)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_browsers',
    description: 'Browser ids + version tracks.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'support',
    description: 'Convenience: is this feature supported in this browser version? Returns the raw caniuse support string + a parsed verdict.',
    inputSchema: {
      type: 'object',
      properties: {
        feature: { type: 'string', description: 'Feature id (see `search` / `feature`)' },
        browser: { type: 'string', description: 'Browser id (chrome, safari, firefox, edge, ios_saf, ...)' },
        version: { type: 'string', description: 'Browser version (default latest)' },
      },
      required: ['feature', 'browser'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const data = await getData();
  switch (name) {
    case 'feature': {
      const id = reqStr(args, 'name', '"css-grid"');
      const feat = data.data[id];
      if (!feat) throw new Error(`caniuse: feature "${id}" not found`);
      return { id, ...feat };
    }
    case 'search': {
      const q = reqStr(args, 'query', '"grid"').toLowerCase();
      const limit = Math.min(50, Math.max(1, (args.limit as number) ?? 10));
      const results: { id: string; title: string; status?: string }[] = [];
      for (const [id, feat] of Object.entries(data.data)) {
        if (
          id.includes(q) ||
          feat.title.toLowerCase().includes(q) ||
          (feat.keywords ?? '').toLowerCase().includes(q) ||
          (feat.description ?? '').toLowerCase().includes(q)
        ) {
          results.push({ id, title: feat.title, status: feat.status });
          if (results.length >= limit) break;
        }
      }
      return { query: q, count: results.length, features: results };
    }
    case 'list_browsers': {
      const browsers = Object.entries(data.agents).map(([id, a]) => ({
        id,
        browser: a.browser,
        versions: (a.versions ?? []).filter((v): v is string => Boolean(v)).slice(-15),
      }));
      return { count: browsers.length, browsers };
    }
    case 'support': {
      const featId = reqStr(args, 'feature', '"css-grid"');
      const browserId = reqStr(args, 'browser', '"chrome"').toLowerCase();
      const feat = data.data[featId];
      if (!feat) throw new Error(`caniuse: feature "${featId}" not found`);
      const stat = feat.stats?.[browserId];
      if (!stat) throw new Error(`caniuse: no support data for browser "${browserId}"`);
      const requestedVersion = (args.version as string | undefined)?.trim();
      const version = requestedVersion || latestVersion(data, browserId);
      const raw = stat[version];
      return {
        feature: featId,
        title: feat.title,
        browser: browserId,
        version,
        raw,
        verdict: parseVerdict(raw),
      };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function latestVersion(data: CIUData, browserId: string): string {
  const versions = data.agents[browserId]?.versions ?? [];
  // versions trails nulls = unreleased future versions. The last non-null entry is "current".
  for (let i = versions.length - 1; i >= 0; i--) {
    const v = versions[i];
    if (v) return v;
  }
  return '0';
}

// caniuse support codes:
//  y = yes      a = partial   n = no
//  p = poly-fill    u = unknown    x = vendor-prefix
// Multiple separated by space. Plus optional notes after #.
function parseVerdict(raw?: string) {
  if (!raw) return 'unknown';
  const flags = raw.split('#')[0].trim().split(/\s+/);
  if (flags.includes('y')) return 'supported';
  if (flags.includes('a')) return 'partial';
  if (flags.includes('n')) return 'not_supported';
  if (flags.includes('p')) return 'requires_polyfill';
  if (flags.includes('x')) return 'requires_vendor_prefix';
  return 'unknown';
}

async function getData(): Promise<CIUData> {
  if (CACHE && CACHE.expires_at > Date.now()) return CACHE.data;
  const res = await fetch(DATA_URL, {
    headers: { 'User-Agent': 'pipeworx-mcp-caniuse/1.0 (+https://pipeworx.io)' },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`caniuse data fetch error: ${res.status} ${t.slice(0, 200)}`);
  }
  const data = (await res.json()) as CIUData;
  CACHE = { data, expires_at: Date.now() + CACHE_TTL_MS };
  return data;
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) {
    throw new Error(`Required argument "${key}" is missing. Pass a string like ${example}.`);
  }
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
