// Ignore polite termination so the probe verifies escalation before retries and cleanup.
process.on('SIGTERM', () => {});
setInterval(() => {}, 1000);
