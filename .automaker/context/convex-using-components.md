# Using Components

Convex Components add new features to your backend in their own sandbox with their own functions, schema and data, scheduled functions and all other fundamental Convex features.

You can see the full list of components in the [directory](https://convex.dev/components).

## Installation[​](#installation "Direct link to Installation")

We'll use the [Agent](https://www.npmjs.com/package/@convex-dev/agent) component as an example.

1. Install from \`npm\`

   ```
   npm i @convex-dev/agent
   ```

2. Add the component to your app

   Create or update the `convex.config.ts` file in your app's `convex/` folder and install the component by calling `use`. Multiple instances of the same component can be installed by calling `use` multiple times with different names. Each will have their own tables and functions.

   convex/convex.config.ts

   TS

   ```
   import { defineApp } from "convex/server";
   import agent from "@convex-dev/agent/convex.config.js";

   const app = defineApp();

   app.use(agent);
   app.use(agent, { name: "agent2" });
   //... Add other components here

   export default app;
   ```

3. Run convex dev

   The `convex dev` CLI command will generate code necessary for using the component.

   ```
   npx convex dev
   ```

4. Access the component through its API

   Each instance of a component has its API listed under the `components` object by its name. Some components wrap this API with classes or functions. Check out each component's documentation for more details on its usage.

   ```
   import { components } from "./_generated/api.js";

   const agent = new Agent(components.agent, { ... });
   ```

## Using the component's API directly[​](#using-the-components-api-directly "Direct link to Using the component's API directly")

Though components may expose higher level TypeScript APIs, under the hood they are called via normal Convex functions over the component sandbox boundary.

Queries, mutations, and action rules still apply - queries can only call component queries, mutations can also call component mutations, and actions can also call component actions. As a result, queries into components are reactive by default, and mutations have the same transaction guarantees.

Component functions can be called from your application using the following syntax:

```
import { internalAction } from "./_generated/server";
import { components } from "./_generated/api";

export const myAction = internalAction({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    // Call the component's API to get the thread status.
    const { status } = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });
    //...
  },
});
```

Some components abstract away the component's API. For instance, the `Agent` class from `@convex-dev/agent` is initialized with `components.agent`, and its methods take in `ctx` so they can call the component's API internally. [Learn more about the Agent Component here](/agents.md).

## Transactions[​](#transactions "Direct link to Transactions")

Remember that mutation functions in Convex are [transactions](/functions/mutation-functions.md#transactions). Either all the changes in the mutation get written at once or none are written at all.

All writes for a top-level mutation call, including writes performed by calls into other components' mutations, are committed at the same time. If the top-level mutation throws an error, all of the writes are rolled back, and the mutation doesn't change the database at all.

However, if a component mutation call throws an exception, only its writes are rolled back. Then, if the caller catches the exception, it can continue, perform more writes, and return successfully. If the caller doesn't catch the exception, then it's treated as failed and all the writes associated with the caller mutation are rolled back. This means your code can choose a different code path depending on the semantics of your component.

As an example, take the [Rate Limiter](https://www.npmjs.com/package/@convex-dev/ratelimiter) component. One API of the Rate Limiter throws an error if a rate limit is hit:

```
// Automatically throw an error if the rate limit is hit.
await rateLimiter.limit(ctx, "failedLogins", { key: userId, throws: true });
```

If the call to `rateLimiter.limit` throws an exception, we're over the rate limit. Then, if the calling mutation doesn't catch this exception, the whole transaction is rolled back.

The calling mutation, on the other hand, could also decide to ignore the rate limit by catching the exception and proceeding. For example, an app may want to ignore rate limits if there is a development environment override. In this case, only the component mutation will be rolled back, and the rest of the mutation will continue.

## Dashboard[​](#dashboard "Direct link to Dashboard")

You can see your component’s data, functions, files, logs, and other info using the dropdown in the Dashboard. You can also use the dropdown to exclude info from certain components.

![Screenshot of the component dropdown](/screenshots/component_dropdown.png)

## Testing components[​](#testing-components "Direct link to Testing components")

When writing tests with [`convex-test`](/testing/convex-test.md), that use components, you must register the component with the test instance. This tells it what schema to validate and where to find the component source code. Most components export convenient helper functions on `/test` to make this easy:

convex/some.test.ts

TS

```
import agentTest from "@convex-dev/agent/test";
import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import { components } from "./_generated/api";
import { createThread } from "@convex-dev/agent";

// Define this once, often in a shared test helper file.
export function initConvexTest() {
  const t = convexTest();
  agentTest.register(t);
  return t;
}

test("Agent createThread", async () => {
  const t = initConvexTest();

  const threadId = await t.run(async (ctx) => {
    // Calling functions that use ctx and components.agent
    return await createThread(ctx, components.agent, {
      title: "Hello, world!",
    });
  });
  // Calling functions directly on the component's API
  const thread = await t.query(components.agent.threads.getThread, {
    threadId,
  });
  expect(thread).toMatchObject({
    title: "Hello, world!",
  });
});
```

If you need to register the component yourself, you can do so by passing the component's schema and modules to the test instance.

convex/manual.test.ts

TS

```
/// <reference types="vite/client" />
import { test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./path/to/component/schema.ts";
const modules = import.meta.glob("./path/to/component/**/*.ts");

test("Test something with a local component", async () => {
  const t = convexTest();
  t.registerComponent("componentName", schema, modules);

  await t.run(async (ctx) => {
    await ctx.runQuery(components.componentName.someQuery, {
      arg: "value",
    });
  });
});
```

## Log Streams[​](#log-streams "Direct link to Log Streams")

You can use the `data.function.component_path` field in [log streams](/production/integrations/log-streams/.md) to separate log lines based on the component they came from.
