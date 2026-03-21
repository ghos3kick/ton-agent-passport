import { NextRequest, NextResponse } from 'next/server';

const TONAPI_BASE =
  process.env.NEXT_PUBLIC_NETWORK === 'testnet'
    ? 'https://testnet.tonapi.io'
    : 'https://tonapi.io';

const ALLOWED_PREFIXES = ['v2/accounts', 'v2/nfts', 'v2/blockchain'];
const ALLOWED_QUERY_PARAMS = ['limit', 'offset', 'collection', 'account'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join('/');

  // Path traversal protection: reject ".." segments
  if (pathStr.includes('..') || !ALLOWED_PREFIXES.some(prefix => pathStr.startsWith(prefix))) {
    return NextResponse.json({ error: 'Forbidden path' }, { status: 403 });
  }

  // Whitelist query parameters
  const filteredParams = new URLSearchParams();
  for (const key of ALLOWED_QUERY_PARAMS) {
    const value = request.nextUrl.searchParams.get(key);
    if (value !== null) {
      filteredParams.set(key, value);
    }
  }
  const queryString = filteredParams.toString();
  const url = `${TONAPI_BASE}/${pathStr}${queryString ? '?' + queryString : ''}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.TONAPI_KEY}`,
      },
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'TONAPI request failed' }, { status: 502 });
  }
}
