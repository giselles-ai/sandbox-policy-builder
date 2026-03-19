# sandbox-policy-builder

Build network policies for [Vercel Sandbox](https://vercel.com/docs/vercel-sandbox) around services instead of raw domains.

Instead of writing low-level domain rules like this:

```ts
const sandbox = await Sandbox.create({
  networkPolicy: {
    allow: {
      "api.openai.com": [
        {
          transform: [
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
              },
            },
          ],
        },
      ],
    },
  },
});
```

you can write this:

```ts
import { allow } from "sandbox-policy-builder";

const sandbox = await Sandbox.create({
  networkPolicy: allow({
    openai: { apiKey: process.env.OPENAI_API_KEY! },
    claude: { apiKey: process.env.ANTHROPIC_API_KEY! },
    github: { apiKey: process.env.GITHUB_TOKEN! },
  }),
});
```

The package expands service names into the domain-level `NetworkPolicy` shape required by `@vercel/sandbox`.

## Why

Vercel Sandbox credentials brokering is powerful, but the raw SDK API is domain-oriented.

That is precise, but repetitive in real apps:

- `codex` and `openai` both target `api.openai.com`
- `claude` requires `x-api-key` and `anthropic-version`
- `github` often needs multiple related domains
- `aiGateway` is conceptually one service, not one header rule

This package gives you a small DSL that matches how people usually think about these integrations: service first, transport details second.

## Installation

```bash
bun add sandbox-policy-builder
```

Or:

```bash
npm install sandbox-policy-builder
```

## Usage

### OpenAI

```ts
import { allow } from "sandbox-policy-builder";

const sandbox = await Sandbox.create({
  networkPolicy: allow({
    openai: { apiKey: process.env.OPENAI_API_KEY! },
  }),
});
```

### Claude

```ts
import { allow } from "sandbox-policy-builder";

const sandbox = await Sandbox.create({
  networkPolicy: allow({
    claude: { apiKey: process.env.ANTHROPIC_API_KEY! },
  }),
});
```

### GitHub

```ts
const sandbox = await Sandbox.create({
  networkPolicy: allow({
    github: { apiKey: process.env.GITHUB_TOKEN! },
  }),
});
```

This expands to GitHub-related domains including:

- `github.com`
- `*.github.com`
- `api.github.com`

### AI Gateway

```ts
const sandbox = await Sandbox.create({
  networkPolicy: allow({
    aiGateway: { apiKey: process.env.AI_GATEWAY_TOKEN! },
  }),
});
```

### Multiple Products

```ts
const sandbox = await Sandbox.create({
  networkPolicy: allow({
    openai: { apiKey: process.env.OPENAI_API_KEY! },
    claude: { apiKey: process.env.ANTHROPIC_API_KEY! },
    github: { apiKey: process.env.GITHUB_TOKEN! },
    aiGateway: { apiKey: process.env.AI_GATEWAY_TOKEN! },
  }),
});
```

## Supported Products

- `codex`
- `openai`
- `gemini`
- `claude`
- `github`
- `aiGateway`

Use `listSupportedProducts()` to inspect the current set:

```ts
import { listSupportedProducts } from "sandbox-policy-builder";

console.log(listSupportedProducts());
```

## API

### `allow(input)`

Builds a Vercel Sandbox `NetworkPolicy`.

```ts
type AllowInput = Partial<{
  codex: { apiKey: string };
  openai: { apiKey: string };
  gemini: { apiKey: string };
  claude: { apiKey: string };
  github: { apiKey: string };
  aiGateway: { apiKey: string };
}>;
```

Returns:

```ts
type NetworkPolicy =
  | "allow-all"
  | "deny-all"
  | {
      allow?: string[] | Record<string, NetworkPolicyRule[]>;
      subnets?: {
        allow?: string[];
        deny?: string[];
      };
    };
```

### `listSupportedProducts()`

Returns the list of known product names.

## Conflict Handling

Some products compile to the same underlying domain.

For example:

- `codex` -> `api.openai.com`
- `openai` -> `api.openai.com`

If two products generate different rules for the same domain, `allow()` throws.

This is intentional. Silent last-write-wins behavior would make credential brokering hard to reason about.

## Vercel Sandbox Example

```ts
import { Sandbox } from "@vercel/sandbox";
import { allow } from "sandbox-policy-builder";

const sandbox = await Sandbox.create({
  networkPolicy: allow({
    github: { apiKey: process.env.GITHUB_TOKEN! },
    aiGateway: { apiKey: process.env.AI_GATEWAY_TOKEN! },
  }),
});
```

## Updating an Existing Sandbox

If you need open network access during setup and want to lock the sandbox down afterward, `allow()` also works with `updateNetworkPolicy()`:

```ts
await sandbox.updateNetworkPolicy(
  allow({
    openai: { apiKey: process.env.OPENAI_API_KEY! },
  }),
);
```

## Notes

- This package does not change how Vercel Sandbox works. It only builds the `NetworkPolicy` object.
- Product names are convenience abstractions over domains, headers, and credential brokering transforms.
- If a CLI requires a local env var just to start, you may still need a non-secret dummy value in the sandbox process. This package only handles network policy generation.

## References

- [Vercel Sandbox firewall docs](https://vercel.com/docs/vercel-sandbox/concepts/firewall#credentials-brokering)
- [Vercel Sandbox SDK reference](https://vercel.com/docs/vercel-sandbox/sdk-reference)
- [OpenAI API auth](https://platform.openai.com/docs/api-reference/authentication)
- [Anthropic API docs](https://docs.anthropic.com/en/api/getting-started)
