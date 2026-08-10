/**
 * Horizon background worker
 * Handles: media processing, notifications fanout, scheduled posts,
 * email delivery, trend calculation, cleanup, federation jobs.
 *
 * Uses BullMQ + Redis. Expensive work is never done in the request path.
 */

console.log("Horizon worker starting...");
// Full queue processors are implemented in subsequent phases.
// This process stays alive and will connect to Redis/queues when configured.
setInterval(() => {
  // heartbeat placeholder
}, 60_000);
