// ignore polite termination so the probe verifies escalation before retries and cleanup.
process.on('SIGTERM', () => {});
process.send('ready');
process.disconnect();
setInterval(() => {}, 1000);
