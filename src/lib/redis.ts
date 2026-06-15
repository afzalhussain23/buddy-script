import "server-only";

import { Redis } from "@upstash/redis";

// Shared Upstash Redis connection for @upstash/ratelimit. Reads
// UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from the environment.
export const redis = Redis.fromEnv();

// Separate client for Better Auth's secondaryStorage. Its contract is
// string-in/string-out; default automatic (de)serialization would JSON-parse
// stored values on read and hand Better Auth an object instead of the string it
// wrote, corrupting sessions and rate-limit entries.
export const authRedis = Redis.fromEnv({ automaticDeserialization: false });
