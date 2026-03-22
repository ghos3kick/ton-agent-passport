import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AgentPassportSDK } from "@agent-passport/sdk";

// Trust score calculation (mirrored from bot/services/reputation.ts)
interface TrustScore {
  total: number;
  level: string;
  breakdown: {
    existence: number;
    activity: number;
    age: number;
    capabilities: number;
  };
}

function calculateTrustScore(data: {
  capabilities: string;
  txCount: number;
  createdAt: number;
  revokedAt: number;
}): TrustScore {
  if (data.revokedAt > 0) {
    return {
      total: 0,
      level: "revoked",
      breakdown: { existence: 0, activity: 0, age: 0, capabilities: 0 },
    };
  }

  const existence = 10;

  const capCount = data.capabilities
    ? data.capabilities.split(",").filter((c) => c.trim()).length
    : 0;
  const capabilities = Math.min(10, capCount * 2);

  const txCount = data.txCount || 0;
  const activity = Math.min(50, txCount * 5);

  let age = 0;
  if (data.createdAt > 0) {
    const daysSinceCreation = Math.floor(
      (Date.now() / 1000 - data.createdAt) / 86400
    );
    age = Math.min(30, Math.max(0, daysSinceCreation));
  }

  const total = Math.min(100, existence + activity + age + capabilities);

  let level: string;
  if (total >= 80) level = "elite";
  else if (total >= 60) level = "verified";
  else if (total >= 40) level = "trusted";
  else if (total > 0) level = "new";
  else level = "none";

  return { total, level, breakdown: { existence, activity, age, capabilities } };
}

// Initialize SDK
const sdk = new AgentPassportSDK({
  registryAddress:
    process.env.REGISTRY_ADDRESS ||
    "kQBI0vbuDJiN3pOKPKpCcT1mcZUzFHDkfH9astwv018XoFdz",
  tonapiKey: process.env.TONAPI_KEY,
  network: (process.env.NETWORK as "mainnet" | "testnet") || "testnet",
});

const server = new McpServer({
  name: "agent-passport",
  version: "1.0.0",
});

// Tool 1: get_passport
server.tool(
  "get_passport",
  "Get agent passport data by owner address",
  { address: z.string().describe("TON wallet address of the agent owner") },
  async ({ address }) => {
    try {
      const passports = await sdk.getPassportsByOwner(address);
      if (passports.length === 0) {
        return {
          content: [{ type: "text", text: "No passport found for this address" }],
        };
      }
      const passport = passports[0];
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                address: passport.address,
                ownerAddress: passport.ownerAddress,
                capabilities: passport.capabilities,
                endpoint: passport.endpoint,
                txCount: passport.txCount,
                createdAt: passport.createdAt,
                revokedAt: passport.revokedAt,
                isActive: passport.isActive,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
      };
    }
  }
);

// Tool 2: get_trust_score
server.tool(
  "get_trust_score",
  "Get agent trust score breakdown by owner address",
  { address: z.string().describe("TON wallet address of the agent owner") },
  async ({ address }) => {
    try {
      const passports = await sdk.getPassportsByOwner(address);
      if (passports.length === 0) {
        return {
          content: [{ type: "text", text: "No passport found for this address" }],
        };
      }
      const passport = passports[0];
      const score = calculateTrustScore({
        capabilities: passport.capabilities,
        txCount: passport.txCount,
        createdAt: passport.createdAt,
        revokedAt: passport.revokedAt,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(score, null, 2) }],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
      };
    }
  }
);

// Tool 3: verify_agent
server.tool(
  "verify_agent",
  "Check if agent is trusted above a minimum score threshold",
  {
    address: z.string().describe("TON wallet address of the agent owner"),
    minScore: z
      .number()
      .default(30)
      .describe("Minimum trust score threshold (default: 30)"),
  },
  async ({ address, minScore }) => {
    try {
      const passports = await sdk.getPassportsByOwner(address);
      if (passports.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  trusted: false,
                  reason: "No passport found for this address",
                  score: 0,
                  passport: null,
                },
                null,
                2
              ),
            },
          ],
        };
      }
      const passport = passports[0];
      const score = calculateTrustScore({
        capabilities: passport.capabilities,
        txCount: passport.txCount,
        createdAt: passport.createdAt,
        revokedAt: passport.revokedAt,
      });
      const trusted = score.total >= minScore;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                trusted,
                reason: trusted
                  ? `Agent trust score ${score.total} meets threshold ${minScore}`
                  : `Agent trust score ${score.total} is below threshold ${minScore}`,
                score: score.total,
                level: score.level,
                passport: {
                  address: passport.address,
                  capabilities: passport.capabilities,
                  endpoint: passport.endpoint,
                  isActive: passport.isActive,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
      };
    }
  }
);

// Tool 4: list_agents
server.tool(
  "list_agents",
  "List all registered agents in the registry",
  {
    limit: z
      .number()
      .default(50)
      .describe("Maximum number of agents to return (default: 50)"),
    offset: z
      .number()
      .default(0)
      .describe("Number of agents to skip (default: 0)"),
  },
  async ({ limit, offset }) => {
    try {
      const passports = await sdk.listPassports({ limit, offset });
      const result = passports.map((p) => ({
        address: p.address,
        ownerAddress: p.ownerAddress,
        capabilities: p.capabilities,
        endpoint: p.endpoint,
        txCount: p.txCount,
        isActive: p.isActive,
      }));
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ count: result.length, agents: result }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
      };
    }
  }
);

// Tool 5: search_by_capability
server.tool(
  "search_by_capability",
  "Find agents with a specific capability (e.g. trading, security-audit)",
  {
    capability: z
      .string()
      .describe('Capability to search for (e.g. "trading", "security-audit")'),
  },
  async ({ capability }) => {
    try {
      const passports = await sdk.searchByCapability(capability);
      const result = passports.map((p) => ({
        address: p.address,
        ownerAddress: p.ownerAddress,
        capabilities: p.capabilities,
        endpoint: p.endpoint,
        isActive: p.isActive,
      }));
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { capability, count: result.length, agents: result },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ],
      };
    }
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
