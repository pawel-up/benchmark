# Groups

Groups provide a mechanism to organize benchmark functions and share setup/teardown logic within a suite. This is particularly useful for benchmarks that test different aspects of a single feature or module.

## Group Setup Function

A group can have a suite-level setup function that executes **once before the first benchmark in the group runs**. This is ideal for initializing resources or configurations that are shared across all benchmarks within the group.

The return value of the group suite setup function is passed as an argument to the next setup function in the chain, which could be a group benchmark setup function or the benchmark function itself if no group benchmark setup is defined.

```typescript
import { Suite } from '@pawel-up/benchmark'

const suite = new Suite('My Suite');

suite.setSetup(() => {
  // Global suite setup (runs before all benchmarks)
  console.log('Global setup');
  return { globalValue: 'from global' };
});

suite.setGroupSuiteSetup('My Group', (global) => {
  // Group suite setup (runs once before the first benchmark in "My Group")
  console.log('Group suite setup:', global); // globalValue: 'from global'
  return { ...global, groupValue: 'from group' };
});

suite.group('My Group', 'Benchmark 1', (group) => {
  // Benchmark function 1 in "My Group"
  console.log('Benchmark 1:', group); // { globalValue: 'from global', groupValue: 'from group' }
});

suite.group('My Group', 'Benchmark 2', (group) => {
  // Benchmark function 2 in "My Group"
  console.log('Benchmark 2:', group); // { globalValue: 'from global', groupValue: 'from group' }
});

suite.run();
```

## Group Benchmark Setup Function

A group can also have a benchmark-level setup function that executes **before each benchmark function within the group**. This allows for setup specific to individual benchmarks within the group while still potentially leveraging shared setup from the group suite setup.

The return value of the group benchmark setup function is passed as an argument to the benchmark function.  It also receives the return value of the group suite setup function (if any) as its argument.

```typescript
import { Suite } from '@pawel-up/benchmark'

const suite = new Suite('My Suite');

suite.setGroupSuiteSetup('My Group', () => {
  // Group suite setup (runs once before the first benchmark in "My Group")
  console.log('Group suite setup');
  return { sharedValue: 'from group suite' };
});

suite.setGroupBenchmarkSetup('My Group', (shared) => {
  // Group benchmark setup (runs before each benchmark in "My Group")
  console.log('Group benchmark setup:', shared); // { sharedValue: 'from group suite' }
  return { ...shared, benchmarkValue: 'from benchmark setup' };
});

suite.group('My Group', 'Benchmark 1', (benchmark) => {
  // Benchmark function 1 in "My Group"
  console.log('Benchmark 1:', benchmark); // { sharedValue: 'from group suite', benchmarkValue: 'from benchmark setup' }
});

suite.group('My Group', 'Benchmark 2', (benchmark) => {
  // Benchmark function 2 in "My Group"
  console.log('Benchmark 2:', benchmark); // { sharedValue: 'from group suite', benchmarkValue: 'from benchmark setup' }
});

suite.run();
```

## Group Benchmark Teardown Function

Similar to the setup, a group can have a benchmark-level teardown function that executes **after each benchmark function within the group**. This is useful for cleaning up resources or state specific to an individual benchmark.

```typescript
// Example (add to the previous example)
suite.setGroupBenchmarkTeardown('My Group', () => {
  console.log('Group benchmark teardown: Cleaning up after a benchmark in My Group');
});
```

## Group Teardown Function

A group can have a suite-level teardown function that executes **once after the last benchmark in the group has completed**. This is useful for releasing resources or performing cleanup that applies to the entire group.

```typescript
// Example (add to the previous example)
suite.setGroupSuiteTeardown('My Group', () => {
  console.log('Group suite teardown: Cleaning up after My Group');
});
```

## Lifecycle Call Order

The execution order of setup and teardown functions within a group is as follows:

1. **Group Suite Setup** (if defined using `suite.setGroupSuiteSetup()` and this is the first benchmark of the group)
2. **Group Benchmark Setup** (if defined using `suite.setGroupBenchmarkSetup()`)
3. **Global Suite Setup** (if defined using `suite.setSetup()` and added to the queue using `suite.setup()`)
4. **Benchmark Function**
5. **Group Benchmark Teardown** (if defined using `suite.setGroupBenchmarkTeardown()`)
6. **Group Suite Teardown** (if defined using `suite.setGroupSuiteTeardown()` and this is the last benchmark of the group)

**Note:** If a global suite setup and a group suite setup are both defined, the global suite setup will execute first, and its return value will be passed to the group suite setup function.  Similarly, the return value of the group suite setup will be passed to the group benchmark setup, and so on, until it reaches the benchmark function.

**Important:** The `setup()` method adds the global setup function to the execution queue. If you don't call `setup()`, the global setup function will not be executed.  You can call `setup()` multiple times to add different setup functions to the queue, and they will be executed in the order they were added.
