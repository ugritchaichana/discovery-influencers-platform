# Application Logging System

## Overview
This project uses a custom logger that writes logs to both console (for real-time monitoring) and database (for persistence and analysis).

## Architecture

### Components
- **`lib/logger.ts`**: Core logger with batching for database writes
- **`lib/cleanup-logs.ts`**: Maintenance utilities for log retention
- **`prisma/schema.prisma`**: `ApplicationLog` model definition
- **Database**: Supabase PostgreSQL (free tier)

### Features
- ✅ Structured logging with scope, level, message, and metadata
- ✅ Batched database writes (50 logs or 10 seconds)
- ✅ Automatic error serialization
- ✅ Graceful shutdown handling
- ✅ Console fallback if database unavailable

## Usage

### Basic Logging
```typescript
import { createLogger } from "@/lib/logger";

const logger = createLogger("my-module");

// Info level
logger.info("User logged in", { userId: "123", email: "user@example.com" });

// Warning level
logger.warn("Rate limit approaching", { requests: 95, limit: 100 });

// Error level with automatic serialization
logger.error("Database query failed", { 
  error: new Error("Connection timeout"),
  query: "SELECT * FROM users" 
});
```

### Log Levels
- **`info`**: Normal operational events (login, data created, etc.)
- **`warn`**: Potentially problematic situations (validation failures, deprecated usage)
- **`error`**: Error conditions (exceptions, failed operations)

### Metadata
Pass any JSON-serializable object as metadata. The `error` field is automatically serialized with `name`, `message`, and `stack`.

## Database Persistence

### Batching Strategy
Logs are buffered and written to database in batches to optimize for Supabase free tier:
- **Batch size**: 50 logs (configurable via `BATCH_SIZE`)
- **Flush interval**: 10 seconds (configurable via `FLUSH_INTERVAL_MS`)
- **Immediate flush**: Triggered when batch size reached
- **Graceful shutdown**: Flushes remaining logs on `SIGTERM`/`SIGINT`/`beforeExit`

### Schema
```prisma
model ApplicationLog {
  id        String   @id @default(cuid())
  timestamp DateTime @default(now())
  level     String   // "info", "warn", "error"
  scope     String   // e.g., "auth/login"
  message   String
  metadata  Json?    // JSONB column for flexible data
  
  @@index([timestamp]) // Optimized for cleanup queries
}
```

### Querying Logs
```typescript
import prisma from "@/lib/prisma";

// Get recent errors
const recentErrors = await prisma.applicationLog.findMany({
  where: { level: "error" },
  orderBy: { timestamp: "desc" },
  take: 100,
});

// Count logs by level
const logCounts = await prisma.applicationLog.groupBy({
  by: ["level"],
  _count: true,
});

// Search by scope
const authLogs = await prisma.applicationLog.findMany({
  where: { scope: { startsWith: "auth/" } },
  orderBy: { timestamp: "desc" },
});
```

## Maintenance

### Log Cleanup
To prevent storage exhaustion on Supabase free tier (500MB limit), regularly delete old logs:

```bash
# Delete logs older than 7 days (default)
npx tsx lib/cleanup-logs.ts

# Delete logs older than 30 days
npx tsx lib/cleanup-logs.ts 30
```

### Recommended Schedule
Add to `package.json`:
```json
{
  "scripts": {
    "cleanup:logs": "tsx lib/cleanup-logs.ts 7"
  }
}
```

Set up a cron job or scheduled task:
```bash
# Daily cleanup at 2 AM
0 2 * * * cd /path/to/project && pnpm cleanup:logs
```

### Monitoring
```typescript
import { getLogStats } from "@/lib/cleanup-logs";

const stats = await getLogStats();
console.log(stats);
// {
//   total: 15234,
//   byLevel: { info: 12000, warn: 2500, error: 734 },
//   oldestLog: 2024-11-07T10:30:00.000Z,
//   newestLog: 2024-11-14T08:45:00.000Z
// }
```

## Supabase Free Tier Limits

### Storage
- **Total database**: 500MB
- **Estimated log size**: ~500 bytes per log entry
- **Capacity**: ~1 million logs (theoretical max)

### Bandwidth
- **Monthly limit**: 2GB
- **Write operations**: Batched to minimize connections

### Recommendations
1. **Retention period**: 7-14 days for high-traffic apps, 30 days for low-traffic
2. **Log selectively**: Don't log every request; focus on important events
3. **Monitor usage**: Run `getLogStats()` weekly to check growth
4. **Cleanup automation**: Schedule daily/weekly cleanup jobs
5. **Archive critical logs**: Export important logs before deletion if needed

## Performance Considerations

### Write Optimization
- Logs are batched to reduce database round-trips
- Console output is immediate for real-time monitoring
- Database writes happen asynchronously (non-blocking)

### Query Optimization
- `timestamp` is indexed for fast cleanup queries
- Use `where` clauses on `level` and `scope` for filtering
- Limit result sets with `take` to avoid large data transfers

### Error Handling
- Database write failures fall back to console logging
- Application continues to function if database is unavailable
- Errors during cleanup are logged but don't crash the process

## Migration

### Initial Setup
```bash
# Generate Prisma client with new model
npx prisma generate

# Apply migration (when database is available)
npx prisma migrate deploy
```

### Rollback
If you need to remove the logging system:
```bash
# Create rollback migration
npx prisma migrate dev --name remove_application_logs

# Manually edit migration.sql:
# DROP INDEX "application_logs_timestamp_idx";
# DROP TABLE "application_logs";
```

## Troubleshooting

### "Property 'applicationLog' does not exist"
Run `npx prisma generate` to regenerate the Prisma client after schema changes.

### Logs not appearing in database
1. Check database connection (`.env` has valid `DATABASE_URL`)
2. Verify migration applied (`npx prisma migrate status`)
3. Check console for database error fallback messages

### High storage usage
1. Check log count: `await prisma.applicationLog.count()`
2. Run cleanup: `npx tsx lib/cleanup-logs.ts 7`
3. Reduce retention period or log less frequently

## Future Enhancements
- [ ] Log levels configuration (enable/disable levels via env vars)
- [ ] Sampling (log only 1% of info-level events for high-traffic endpoints)
- [ ] Log streaming to external services (Sentry, Datadog, etc.)
- [ ] Compression for archived logs
- [ ] Web UI for log browsing and filtering
