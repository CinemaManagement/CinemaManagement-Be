const cron = require("node-cron");
const Showtime = require("../../models/Showtime");
const STATUS = require("../../constraints/status");

/**
 * Automates showtime status transitions:
 * - ACTIVE -> SHOWING when startTime <= now
 * - SHOWING/ACTIVE -> FINISHED when endTime <= now
 * Runs every minute.
 */
cron.schedule("* * * * *", async () => {
  try {
    const now = new Date();

    // 1. Transition to SHOWING (from ACTIVE)
    const started = await Showtime.updateMany(
      {
        status: STATUS.ACTIVE,
        startTime: { $lte: now },
      },
      { $set: { status: STATUS.SHOWING } },
    );

    // 2. Transition to FINISHED (from ACTIVE or SHOWING)
    const finished = await Showtime.updateMany(
      {
        status: { $in: [STATUS.ACTIVE, STATUS.SHOWING] },
        endTime: { $lte: now },
      },
      { $set: { status: STATUS.FINISHED } },
    );

    if (started.modifiedCount > 0 || finished.modifiedCount > 0) {
      console.log(
        `[Cron Job] Updated ${started.modifiedCount} showtimes to SHOWING and ${finished.modifiedCount} to FINISHED.`,
      );
    }
  } catch (error) {
    console.error("[Showtime Status Cron Error]:", error);
  }
});

console.log("Showtime status automation job initialized.");
