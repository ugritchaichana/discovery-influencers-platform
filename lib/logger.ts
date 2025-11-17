import prisma from "./prisma";

type LogLevel = "info" | "warn" | "error";

type LogDetails = Record<string, unknown> & {
  error?: unknown;
};

interface LogEntry {
  level: LogLevel;
  scope: string;
  message: string;
  metadata?: Record<string, unknown>;
}

// Batch configuration for Supabase free tier optimization
const BATCH_SIZE = 50; // Maximum logs to accumulate before flushing
const FLUSH_INTERVAL_MS = 10000; // Flush every 10 seconds
const logBuffer: LogEntry[] = [];
let flushTimer: NodeJS.Timeout | null = null;

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  return { message: "Unknown error", value: error };
}

function sanitizeMeta(meta?: LogDetails) {
  if (!meta) {
    return undefined;
  }

  if (!("error" in meta) || meta.error === undefined) {
    return meta;
  }

  const { error, ...rest } = meta;
  return {
    ...rest,
    error: serializeError(error),
  };
}

async function flushLogsToDatabase() {
  if (logBuffer.length === 0) {
    return;
  }

  const logsToWrite = logBuffer.splice(0, logBuffer.length);

  try {
    await prisma.applicationLog.createMany({
      data: logsToWrite.map((log) => ({
        level: log.level,
        scope: log.scope,
        message: log.message,
        metadata: log.metadata || undefined,
      })),
      skipDuplicates: true,
    });
  } catch (dbError) {
    // If database write fails, log to console as fallback
    console.error("[logger] Failed to write logs to database:", dbError);
    logsToWrite.forEach((log) => {
      console.log(`[${log.scope}] ${log.message}`, log.metadata);
    });
  }
}

function scheduleFlush() {
  if (flushTimer) {
    return;
  }

  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushLogsToDatabase().catch((err) => {
      console.error("[logger] Flush error:", err);
    });
  }, FLUSH_INTERVAL_MS);
}

function writeLog(level: LogLevel, scope: string, message: string, meta?: LogDetails) {
  const payload = sanitizeMeta(meta);
  const prefix = `[${scope}] ${message}`;
  const writer = level === "info" ? console.info : level === "warn" ? console.warn : console.error;

  // Write to console immediately for real-time monitoring
  if (payload) {
    writer(prefix, payload);
  } else {
    writer(prefix);
  }

  // Add to buffer for database persistence
  logBuffer.push({
    level,
    scope,
    message,
    metadata: payload,
  });

  // Flush immediately if batch size reached, otherwise schedule
  if (logBuffer.length >= BATCH_SIZE) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    flushLogsToDatabase().catch((err) => {
      console.error("[logger] Immediate flush error:", err);
    });
  } else {
    scheduleFlush();
  }
}

export type Logger = {
  info: (message: string, meta?: LogDetails) => void;
  warn: (message: string, meta?: LogDetails) => void;
  error: (message: string, meta?: LogDetails) => void;
};

export function createLogger(scope: string): Logger {
  return {
    info: (message, meta) => writeLog("info", scope, message, meta),
    warn: (message, meta) => writeLog("warn", scope, message, meta),
    error: (message, meta) => writeLog("error", scope, message, meta),
  };
}

// Graceful shutdown: flush remaining logs
if (typeof process !== "undefined") {
  const shutdownHandler = () => {
    if (flushTimer) {
      clearTimeout(flushTimer);
    }
    flushLogsToDatabase().catch((err) => {
      console.error("[logger] Shutdown flush error:", err);
    });
  };

  process.on("beforeExit", shutdownHandler);
  process.on("SIGTERM", shutdownHandler);
  process.on("SIGINT", shutdownHandler);
}
