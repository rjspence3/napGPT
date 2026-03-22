import { Redis } from "@upstash/redis";
import { isTestMode } from "@/lib/utils/env";

export interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
}

export interface RateLimiter {
    check(identifier: string): Promise<RateLimitResult>;
    clear(): Promise<void>;
}

// Lua script: atomically increment and set expiry on first write.
// If the server crashes after INCR but before EXPIRE, the key would
// have lived forever — running both commands inside Lua prevents that.
const INCR_WITH_EXPIRY_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`;

export class MemoryRateLimiter implements RateLimiter {
    private cache = new Map<string, { count: number; reset: number }>();
    private limit: number;
    private window: number;

    constructor(limit: number = 10, window: number = 60000) {
        this.limit = limit;
        this.window = window;
    }

    async check(identifier: string): Promise<RateLimitResult> {
        const now = Date.now();
        const record = this.cache.get(identifier);

        if (!record || now > record.reset) {
            this.cache.set(identifier, { count: 1, reset: now + this.window });
            return {
                success: true,
                limit: this.limit,
                remaining: this.limit - 1,
                reset: now + this.window,
            };
        }

        if (record.count >= this.limit) {
            return {
                success: false,
                limit: this.limit,
                remaining: 0,
                reset: record.reset,
            };
        }

        record.count += 1;
        return {
            success: true,
            limit: this.limit,
            remaining: this.limit - record.count,
            reset: record.reset,
        };
    }

    async clear(): Promise<void> {
        this.cache.clear();
    }
}

export class RedisRateLimiter implements RateLimiter {
    private redis: Redis;
    private limit: number;
    private window: number;

    constructor(limit: number = 10, window: number = 60000) {
        this.redis = new Redis({
            url: process.env.KV_REST_API_URL ?? "",
            token: process.env.KV_REST_API_TOKEN ?? "",
        });
        this.limit = limit;
        this.window = window;
    }

    async check(identifier: string): Promise<RateLimitResult> {
        const key = `ratelimit:${identifier}`;
        const now = Date.now();
        const windowSec = Math.ceil(this.window / 1000);

        // Atomic: INCR + EXPIRE in a single Lua script to prevent
        // the key from persisting forever if the process crashes
        // between the two operations.
        const count = await this.redis.eval(
            INCR_WITH_EXPIRY_SCRIPT,
            [key],
            [String(windowSec)],
        ) as number;

        const ttl = await this.redis.ttl(key);
        const reset = now + (ttl * 1000);

        if (count > this.limit) {
            return {
                success: false,
                limit: this.limit,
                remaining: 0,
                reset: reset,
            };
        }

        return {
            success: true,
            limit: this.limit,
            remaining: Math.max(0, this.limit - count),
            reset: reset,
        };
    }

    async clear(): Promise<void> {
        if (isTestMode()) {
            // Delete only keys belonging to this app; never flushdb() the
            // entire database, which would wipe all data on a shared instance.
            const keys = await this.redis.keys("ratelimit:*");
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        }
    }
}

export function getRateLimiter(limit: number, window: number): RateLimiter {
    if (process.env.KV_URL && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        return new RedisRateLimiter(limit, window);
    }
    return new MemoryRateLimiter(limit, window);
}
