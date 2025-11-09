# TypeScript Project Guidelines (for LLM coding assistants)

> Single-source markdown you can drop in as `GUIDELINES.md`.
> Assumes **npm**, **Vitest**, **Fishery**, **ESLint**, **TypeDoc**, and optional **SonarCloud** for static analysis.

---

## Core principles

1. **Scenario testing first.** Tests read like user stories: initial condition in the description, a single action, and readable domain expectations.
2. **TDD loop.** Write a failing test for the right reason → make the **smallest** change to pass → refactor safely → re-run tests. Commit at each green step.
3. **Minimal, sharp code.** Implement only what the story demands (YAGNI). Keep types narrow, names clear, and functions small.
4. **Verify before change.** Dry-run scripts by default; show plan & sample impact; only then apply. Capture before/after evidence.
5. **Non-speculation.** Don't invent future features/fallbacks outside the story. Park ideas in `RecommendedActions.md`.
6. **Documentation via TypeDoc.** No drive-by `//` comments unless unavoidable; document exported APIs with docblocks.

---

## Tooling (npm-based)

- **Test runner:** Vitest (`npm test`)
- **Factories:** Fishery
- **Lint/format:** ESLint via Next.js (`npm run lint`)
- **Docs:** TypeDoc (`npm run docs`)
- **Static analysis (optional but recommended):** SonarCloud / SonarQube (`npm run analyze`)

Actual `package.json` scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "next lint",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "docs": "typedoc",
    "analyze": "sonar-scanner",
    "script": "node" // run scripts: `npm run script -- scripts/audit-orders.mjs --minutes 30`
  }
}
```

---

## TDD workflow (for humans and LLMs)

**Goal:** fast, safe, incremental delivery.

```mermaid
flowchart LR
  A[Write failing test\n(fails for the right reason)] --> B[Minimal code change\n(make it pass)]
  B --> C[Refactor safely\n(tidy-first principles)]
  C --> D[Re-run tests\n(all green)]
  D --> E[Commit]
  E --> A
```

### Rules
- **Red:** Author a scenario test that fails **only** because the feature is missing. Avoid incidental breakage.
- **Green:** Make the **smallest** change that satisfies the behavior.
- **Refactor:** Improve names, split functions, remove duplication; **no behavior change**.
- **Commit:** After every green state. Examples:
  - `test(checkout): failing scenario for submitting draft order`
  - `feat(checkout): minimal change to submit draft order`
  - `refactor(checkout): extract payment adapter`
  - `chore(scripts): add dry-run to deactivate-inactive-users`

---

## Scenario testing (Vitest + Fishery + domain matchers)

### Factories (Fishery) with generic `onCreate` persistence

```ts
// test/factories/repo.ts
export interface Repo<T> {
  create(input: T): Promise<T>;
}

// Generic onCreate adapter for Fishery
export const onCreateWith =
  <T>(repo: Repo<T>['create']) =>
  async (model: T) => repo(model);
```

```ts
// test/factories/userFactory.ts
import { Factory } from 'fishery';
import { onCreateWith, Repo } from './repo';

export type User = {
  id: string;
  email: string;
  name: string;
  status: 'active' | 'inactive';
  createdAt: Date;
};

export const userRepo: Repo<User> = {
  async create(u) {
    // persist user in DB; replace with real ORM/adapter
    return { ...u };
  }
};

export const userFactory = Factory.define<User>(({ sequence }) => ({
  id: `user_${sequence}`,
  email: `user${sequence}@example.com`,
  name: `User ${sequence}`,
  status: 'active',
  createdAt: new Date('2024-01-01T00:00:00Z')
}))
  // .build() returns a plain object (no I/O)
  // .create() will call the repo's create()
  .onCreate(onCreateWith(userRepo.create));
```

```ts
// test/factories/orderFactory.ts
import { Factory } from 'fishery';
import { onCreateWith, Repo } from './repo';

export type Order = {
  id: string;
  userId: string;
  totalCents: number;
  state: 'draft' | 'submitted' | 'paid' | 'cancelled';
  createdAt: Date;
};

export const orderRepo: Repo<Order> = {
  async create(o) {
    return { ...o };
  }
};

export const orderFactory = Factory.define<Order>(({ sequence }) => ({
  id: `order_${sequence}`,
  userId: `user_${sequence}`,
  totalCents: 5000,
  state: 'draft',
  createdAt: new Date('2024-01-01T00:00:00Z')
})).onCreate(onCreateWith(orderRepo.create));
```

### Composable domain setup (ExUnit-style)

```ts
// test/setup/domainSetup.ts
import { userFactory } from '../factories/userFactory';
import { orderFactory } from '../factories/orderFactory';

export type TestCtx = {
  now: Date;
  users: Record<string, any>;
  orders: Record<string, any>;
};

export const emptyCtx = (): TestCtx => ({
  now: new Date('2024-01-01T00:00:00Z'),
  users: {},
  orders: {}
});

export const compose =
  (...steps: Array<(c: TestCtx) => TestCtx | Promise<TestCtx>>) =>
  (seed: TestCtx) =>
    steps.reduce(async (accP, step) => step(await accP), Promise.resolve(seed));

export const withUser =
  (key: string, overrides?: Partial<ReturnType<typeof userFactory.build>>) =>
  (ctx: TestCtx): TestCtx => {
    const user = userFactory.build(overrides);
    return { ...ctx, users: { ...ctx.users, [key]: user } };
  };

export const withDraftOrderFor =
  (key: string, overrides?: Partial<ReturnType<typeof orderFactory.build>>) =>
  (ctx: TestCtx): TestCtx => {
    const user = ctx.users[key];
    if (!user) throw new Error(`Unknown user key: ${key}`);
    const order = orderFactory.build({ userId: user.id, ...overrides });
    return { ...ctx, orders: { ...ctx.orders, [order.id]: order } };
  };

// Optional: DB-backed setup
export const persistOrder =
  (orderId: string) =>
  async (ctx: TestCtx): Promise<TestCtx> => {
    const order = ctx.orders[orderId];
    await orderFactory.onCreate!.call(undefined, order); // generic persist
    return ctx;
  };
```

### Domain matchers (readable expectations)

```ts
// test/matchers/orderMatchers.ts
import { expect } from 'vitest';

type Order = { state: string; totalCents: number };

expect.extend({
  toBePaid(order: Order) {
    const pass = order.state === 'paid';
    return { pass, message: () => `expected 'paid' but was '${order.state}'` };
  },
  toCost(order: Order, cents: number) {
    const pass = order.totalCents === cents;
    return { pass, message: () => `expected ${cents}c but was ${order.totalCents}c` };
  }
});

declare module 'vitest' {
  interface Assertion<T = any> {
    toBePaid(): T;
    toCost(cents: number): T;
  }
}
```

### Scenario example + TDD cadence

```ts
// test/scenarios/checkout.scenario.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { emptyCtx, compose, withUser, withDraftOrderFor } from '../setup/domainSetup';
import '../matchers/orderMatchers';
import { submitOrder, chargeOrder } from '../../src/domain/checkoutService';

// RED: write failing test for the right reason
describe('Scenario: User submits and pays for an order', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2024-01-01T00:00:00Z') });
  });

  it('Given an active user with a draft order, when they submit and pay, then the order is paid with the expected total', async () => {
    const ctx = await compose(
      withUser('u1', { id: 'user_1', status: 'active' }),
      withDraftOrderFor('u1', { id: 'order_1', totalCents: 7500 })
    )(emptyCtx());

    const submitted = await submitOrder(ctx.orders['order_1']);
    const paid = await chargeOrder(submitted, { method: 'card_on_file' });

    expect(paid).toBePaid();
    expect(paid).toCost(7500);
  });
});
```

```ts
// src/domain/checkoutService.ts
export async function submitOrder(order: { id: string; state: string }) {
  if (order.state !== 'draft') throw new Error('Order is not draft');
  return { ...order, state: 'submitted' as const };
}

export async function chargeOrder(
  order: { id: string; state: string; totalCents?: number },
  opts: { method: 'card_on_file' | 'new_card' }
) {
  if (order.state !== 'submitted') throw new Error('Order is not submitted');
  return { ...order, state: 'paid' as const };
}
```

> **TDD commits**
> 1) Red: `git add -A && git commit -m "test(checkout): failing scenario for draft->paid"`
> 2) Green: `git add -A && git commit -m "feat(checkout): minimal impl to pass scenario"`
> 3) Refactor: `git add -A && git commit -m "refactor(checkout): extract payment adapter"`

---

## Verify-before-change (scripts)

- Every script must support `--dry-run` (default) and `--apply` to commit.
- Print: header, plan, sample of affected rows, total count, and a summary.
- For destructive ops require `--yes` or prompt.
- Re-run relevant tests after running `--apply` (or the whole suite if fast).

```js
// scripts/_runner.mjs
import readline from 'node:readline';

export const parseFlags = (argv = process.argv) => ({
  apply: argv.includes('--apply'),
  yes: argv.includes('--yes')
});

export async function confirmUnlessYes(prompt, yes) {
  if (yes) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ans = await new Promise(res => rl.question(`${prompt} (y/N): `, res));
  rl.close();
  return /^y(es)?$/i.test(ans.trim());
}

export async function withTransaction(opts, work) {
  // hook up real DB tx here
  try {
    const res = await work();
    return res;
  } catch (e) {
    throw e;
  }
}
```

```js
// scripts/deactivate-inactive-users.mjs
#!/usr/bin/env node
import { parseFlags, confirmUnlessYes, withTransaction } from './_runner.mjs';

async function findCandidates() {
  return [{ id: 'user_3', status: 'inactive' }, { id: 'user_9', status: 'inactive' }];
}

async function applyChange(ids, apply) {
  if (!apply) return;
  // UPDATE users SET status='inactive' WHERE id IN (...)
}

async function main() {
  const { apply, yes } = parseFlags();
  console.log('\n=== Deactivate Inactive Users ===');
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);

  const rows = await findCandidates();
  console.table(rows.slice(0, 10));
  console.log(`Total candidates: ${rows.length}`);
  if (!rows.length) return;

  if (!(await confirmUnlessYes('Proceed?', yes))) return;

  await withTransaction({ apply }, async () => {
    await applyChange(rows.map(r => r.id), apply);
    console.log(apply ? 'Applied changes (verified).' : 'Dry run complete.');
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
```

Run:
```bash
npm run script -- scripts/deactivate-inactive-users.mjs        # dry-run
npm run script -- scripts/deactivate-inactive-users.mjs --apply --yes
npm test                                                       # verify afterward
```

---
