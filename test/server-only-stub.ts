// `server-only` is a Next.js guard package that throws if a module is pulled
// into a client bundle. It has no meaning in a Node test runner and is not
// resolvable there, so the integration config aliases it to this empty module.
export {};
