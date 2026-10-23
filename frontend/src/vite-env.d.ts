/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Ambient Vitest globals for test files without requiring node_modules/vitest/globals
declare const describe: any;
declare const it: any;
declare const test: any;
declare const expect: any;
declare const vi: any;
declare const beforeEach: any;
declare const afterEach: any;
declare const beforeAll: any;
declare const afterAll: any;

declare module "@mui/material";
declare module "@mui/material/*";
declare module "@mui/icons-material/*";

