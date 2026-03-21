# API Reference

REST API served by the bot process on port 3001, exposed through nginx at `/api/`.

## Endpoints

### GET /api/health

Health check.

**Response:**
```json
{ "status": "ok" }
```

### GET /api/passports

List registered passports with pagination.

**Query parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 20 | Max results (max 50) |
| offset | number | 0 | Skip first N results |

**Response:**
```json
{
  "total": 6,
  "totalOnChain": 8,
  "revoked": 2,
  "offset": 0,
  "limit": 20,
  "passports": [
    {
      "index": 1,
      "address": "0:e91032de...",
      "owner": "kQCJabQm...",
      "name": "Atlas AI",
      "endpoint": "https://api.atlas-agent.ai/v1",
      "capabilities": "chat,reasoning,code-generation,analysis",
      "metadataUrl": "https://...",
      "txCount": 8,
      "createdAt": 1773898555,
      "revokedAt": 0,
      "isActive": true,
      "trustScore": { "total": 58, "level": "trusted" }
    }
  ]
}
```

### GET /api/reputation/:address

Trust score breakdown for a passport. Accepts owner address or SBT address.

**Response (found):**
```json
{
  "found": true,
  "address": "0:e91032de...",
  "score": 58,
  "level": "trusted",
  "breakdown": {
    "existence": 10,
    "activity": 40,
    "age": 0,
    "capabilities": 8
  },
  "passport": {
    "owner": "kQCJabQm...",
    "endpoint": "https://api.atlas-agent.ai/v1",
    "capabilities": "chat,reasoning,code-generation,analysis",
    "txCount": 8,
    "txVolume": 0,
    "createdAt": 1773898555,
    "revokedAt": 0,
    "isActive": true
  }
}
```

**Response (not found):**
```json
{
  "found": false,
  "score": 0,
  "level": "none",
  "breakdown": { "existence": 0, "activity": 0, "age": 0, "capabilities": 0 },
  "message": "No passport found for this address"
}
```

### POST /api/mint

Mint a new passport. Requires authentication.

**Authentication:** One of:
- `X-Admin-API-Key` header
- `telegramInitData` field in body (validated with HMAC-SHA256)

**Request body:**
```json
{
  "name": "Agent Name",
  "owner": "0QC...",
  "endpoint": "https://agent-api.example.com/v1",
  "capabilities": "chat,reasoning",
  "metadata": "https://example.com/metadata.json"
}
```

**Validation rules:**
- `name`: 3-50 characters, letters/numbers/spaces/dots/hyphens
- `owner`: valid TON address
- `endpoint`: valid HTTP/HTTPS URL
- `metadata`: valid HTTP/HTTPS URL
- All fields max 256 characters (owner max 100)

**Response:**
```json
{ "success": true, "txHash": "seqno:18", "message": "Passport minted successfully" }
```

### POST /api/public-mint-payload

Generate an unsigned transaction payload for public minting via TON Connect.

**Request body:**
```json
{
  "name": "Agent Name",
  "owner": "0QC...",
  "endpoint": "https://agent-api.example.com/v1",
  "capabilities": "chat,reasoning",
  "metadata": "https://example.com/metadata.json"
}
```

**Response:**
```json
{
  "success": true,
  "payload": "te6cck...",
  "address": "EQC...",
  "amount": "120000000",
  "message": "Sign this transaction in your wallet"
}
```

### POST /api/revoke

Block a passport from the explorer. Requires admin API key.

**Headers:** `X-Admin-API-Key`

**Request body:**
```json
{ "sbtAddress": "0:e91032de..." }
```

**Response:**
```json
{ "success": true, "message": "Passport blocked from explorer" }
```

## Rate limiting

| Layer | Scope | Limit |
|-------|-------|-------|
| nginx (general) | All routes | 20 req/s per IP (burst 40) |
| nginx (api) | `/api/` | 5 req/s per IP (burst 20) |
| nginx (body) | `/api/` | 100KB max request body |
| Express (global) | `/api/` | 100 req/min per IP |
| Express (brute force) | `/api/mint`, `/api/revoke` | 10 failed auth attempts → 15 min IP lockout |
| Express (public mint) | `/api/public-mint-payload` | 5 req/min per IP |
| Express (reputation) | `/api/reputation` | 5 req/s per IP |
| Express (passports) | `/api/passports` | 5 req/s per IP |
| Express (body) | All POST | 10KB max JSON body |

## Error responses

All errors follow the format:
```json
{ "error": "Error description" }
```

| Status | Description |
|--------|-------------|
| 400 | Validation error (missing fields, invalid address, bad JSON) |
| 401 | Authentication required |
| 413 | Payload too large (max 10KB) |
| 415 | Content-Type must be application/json |
| 429 | Rate limit exceeded or brute force lockout |
| 500 | Internal server error |
