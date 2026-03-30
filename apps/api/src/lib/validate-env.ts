/**
 * Validates required environment variables at startup.
 * Throws with a clear diagnostic message if any required var is missing,
 * so misconfigured deployments fail immediately rather than at runtime.
 */

const REQUIRED: string[] = ["DATABASE_URL", "WEB_ORIGIN", "PORT"];

const OPTIONAL_WITH_DEFAULTS: Record<string, string> = {
  SOROBAN_RPC_TESTNET_URL: "https://soroban-testnet.stellar.org:443",
  SOROBAN_RPC_FUTURENET_URL: "https://rpc-futurenet.stellar.org:443",
  SOROBAN_RPC_LOCAL_URL: "http://localhost:8000/soroban/rpc",
};

export function validateEnv(): void {
  const missing = REQUIRED.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `[env] Missing required environment variables:\n` +
        missing.map((k) => `  - ${k}`).join("\n") +
        `\n\nCopy apps/api/.env.example to apps/api/.env and fill in the values.`,
    );
  }

  for (const [key, fallback] of Object.entries(OPTIONAL_WITH_DEFAULTS)) {
    if (!process.env[key]) {
      process.env[key] = fallback;
      console.warn(`[env] ${key} not set — using default: ${fallback}`);
    }
  }

  if (!process.env["SOROBAN_RPC_MAINNET_URL"]) {
    console.warn("[env] SOROBAN_RPC_MAINNET_URL is not set. Mainnet RPC calls will fail.");
  }
}
