import type { NetworkPolicy, NetworkPolicyRule } from "@vercel/sandbox";

export type ProductName = "codex" | "gemini" | "openai" | "claude" | "github" | "aiGateway";

export type ApiKeyInput = {
  apiKey: string;
};

export type ClaudeInput = {
  apiKey: string;
  anthropicVersion?: string;
};

export type AllowInput = Partial<{
  codex: ApiKeyInput;
  gemini: ApiKeyInput;
  openai: ApiKeyInput;
  claude: ClaudeInput;
  github: ApiKeyInput;
  aiGateway: ApiKeyInput;
}>;

type ProductDefinition = {
  domains: string[];
  toRules: (input: AllowInput[ProductName]) => NetworkPolicyRule[];
};

const PRODUCT_DEFINITIONS: Record<ProductName, ProductDefinition> = {
  codex: {
    domains: ["api.openai.com"],
    toRules: (input) => [
      {
        transform: [
          {
            headers: {
              Authorization: `Bearer ${input?.apiKey}`,
            },
          },
        ],
      },
    ],
  },
  gemini: {
    domains: ["generativelanguage.googleapis.com"],
    toRules: (input) => [
      {
        transform: [
          {
            headers: {
              "x-goog-api-key": input?.apiKey ?? "",
            },
          },
        ],
      },
    ],
  },
  openai: {
    domains: ["api.openai.com"],
    toRules: (input) => [
      {
        transform: [
          {
            headers: {
              Authorization: `Bearer ${input?.apiKey}`,
            },
          },
        ],
      },
    ],
  },
  claude: {
    domains: ["api.anthropic.com"],
    toRules: (input) => [
      {
        transform: [
          {
            headers: {
              "x-api-key": input?.apiKey ?? "",
            },
          },
        ],
      },
    ],
  },
  github: {
    domains: ["github.com", "*.github.com", "api.github.com"],
    toRules: (input) => [
      {
        transform: [
          {
            headers: {
              Authorization: `Bearer ${input?.apiKey}`,
            },
          },
        ],
      },
    ],
  },
  aiGateway: {
    domains: ["ai-gateway.vercel.sh"],
    toRules: (input) => [
      {
        transform: [
          {
            headers: {
              Authorization: `Bearer ${input?.apiKey}`,
            },
          },
        ],
      },
    ],
  },
};

export function allow(input: AllowInput): NetworkPolicy {
  const allow: Record<string, NetworkPolicyRule[]> = {};

  for (const [productName, productInput] of Object.entries(input) as Array<
    [ProductName, AllowInput[ProductName] | undefined]
  >) {
    if (!productInput) continue;

    const definition = PRODUCT_DEFINITIONS[productName];
    const rules = definition.toRules(productInput);

    for (const domain of definition.domains) {
      const existing = allow[domain];
      if (existing && JSON.stringify(existing) !== JSON.stringify(rules)) {
        throw new Error(`Conflicting credential brokering rules for domain: ${domain}`);
      }
      allow[domain] = rules;
    }
  }

  return { allow };
}

export function listSupportedProducts(): ProductName[] {
  return Object.keys(PRODUCT_DEFINITIONS) as ProductName[];
}
