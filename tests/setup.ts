// Tests run offline. Any real network call fails at once, instead of passing or failing on the network
// of whichever machine runs them. Tests that need HTTP pass their own fetch.
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
  const url = input instanceof Request ? input.url : String(input);
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(url)) return realFetch(input, init);
  throw new Error(`tests are offline: ${url}`);
}) as typeof fetch;
