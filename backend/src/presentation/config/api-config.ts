import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  API_PREFIX: z.string().default('api'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_REFRESH_TTL: z.string().default('30d'),
});

export type ApiConfig = z.infer<typeof schema>;

/**
 * Fails fast on a misconfigured environment: a server that boots without a JWT
 * secret would only reveal the problem once someone tries to sign in.
 */
export function readApiConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const result = schema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n  ');
    throw new Error(`Invalid environment configuration:\n  ${issues}`);
  }
  return result.data;
}

export const API_CONFIG = Symbol('ApiConfig');
