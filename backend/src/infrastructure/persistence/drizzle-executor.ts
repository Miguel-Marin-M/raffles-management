import type { Database } from '../database/client.js';

/**
 * Either the connection pool or an open transaction.
 *
 * Repositories accept this instead of the pool so the very same class serves
 * standalone reads and the transactional work driven by the unit of work.
 */
export type DrizzleExecutor = Database | DrizzleTransaction;

export type DrizzleTransaction = Parameters<Parameters<Database['transaction']>[0]>[0];
