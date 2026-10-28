/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
}

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}