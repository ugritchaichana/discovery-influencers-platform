import prisma from "./prisma";

/**
 * Cleanup old application logs to prevent storage exhaustion on Supabase free tier.
 * Deletes logs older than the specified retention period.
 * 
 * Supabase Free Tier Limits:
 * - 500MB database storage
 * - 2GB bandwidth per month
 * 
 * Recommended retention: 7-30 days depending on log volume
 */
export async function cleanupOldLogs(retentionDays: number = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  try {
    const result = await prisma.applicationLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`[cleanup-logs] Deleted ${result.count} logs older than ${retentionDays} days`);
    return result.count;
  } catch (error) {
    console.error("[cleanup-logs] Failed to delete old logs:", error);
    throw error;
  }
}

/**
 * Get current log statistics for monitoring storage usage
 */
export async function getLogStats() {
  try {
    const [total, byLevel, oldest, newest] = await Promise.all([
      prisma.applicationLog.count(),
      prisma.applicationLog.groupBy({
        by: ["level"],
        _count: true,
      }),
      prisma.applicationLog.findFirst({
        orderBy: { timestamp: "asc" },
        select: { timestamp: true },
      }),
      prisma.applicationLog.findFirst({
        orderBy: { timestamp: "desc" },
        select: { timestamp: true },
      }),
    ]);

    return {
      total,
      byLevel: Object.fromEntries(byLevel.map((item) => [item.level, item._count])),
      oldestLog: oldest?.timestamp,
      newestLog: newest?.timestamp,
    };
  } catch (error) {
    console.error("[cleanup-logs] Failed to get log stats:", error);
    throw error;
  }
}

// CLI execution: node -r tsx/register lib/cleanup-logs.ts [retentionDays]
if (require.main === module) {
  const retentionDays = parseInt(process.argv[2] || "7", 10);

  cleanupOldLogs(retentionDays)
    .then(async (count) => {
      const stats = await getLogStats();
      console.log("[cleanup-logs] Current stats:", stats);
      process.exit(0);
    })
    .catch((error) => {
      console.error("[cleanup-logs] Cleanup failed:", error);
      process.exit(1);
    });
}
