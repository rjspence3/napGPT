import { kv } from "@vercel/kv";

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
    private limit: number;
    private window: number;

    constructor(limit: number = 10, window: number = 60000) {
        this.limit = limit;
        this.window = window;
    }

    async check(identifier: string): Promise<RateLimitResult> {
        const key = `ratelimit:${identifier}`;
        const now = Date.now();

        // Use a transaction to ensure atomicity
        // 1. Increment the counter
        // 2. Set expiry if it's a new key (or refresh it, though standard rate limiting usually sets it on first write)
        // For simplicity with Vercel KV, we can use incr and expire

        const count = await kv.incr(key);

        // If this is the first request (count === 1), set the expiry
        if (count === 1) {
            await kv.expire(key, Math.ceil(this.window / 1000));
        }

        // Get the TTL to return the reset time
        const ttl = await kv.ttl(key);
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
        // For Redis, clearing all rate limits is dangerous/expensive in production.
        // In test mode, we might want to flush, but for now we'll make it a no-op
        // or only clear if explicitly safe.
        // Given this is mostly for local tests which use MemoryRateLimiter, this is fine.
        if (process.env.NODE_ENV === 'test') {
            // potentially await kv.flushdb();
        }
    }
}

export function getRateLimiter(limit: number, window: number): RateLimiter {
    if (process.env.KV_URL && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        return new RedisRateLimiter(limit, window);
    }
    return new MemoryRateLimiter(limit, window);
}
