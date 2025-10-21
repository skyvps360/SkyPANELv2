/**
 * local server entry file, for local development
 * Updated to trigger restart
 */
import app from "./app.js";
import { initSSHBridge } from "./services/sshBridge.js";
import { BillingService } from "./services/billingService.js";
import { DaemonStatusService } from "./services/daemonStatusService.js";

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
  // Initialize websocket SSH bridge on same HTTP server
  initSSHBridge(server);

  // Start hourly billing scheduler
  startBillingScheduler();
});

/**
 * Start the hourly billing scheduler with daemon coordination
 */
function startBillingScheduler() {
  console.log(
    "🕐 Starting hourly VPS billing scheduler with daemon coordination..."
  );

  // Run billing immediately on startup (for any missed billing)
  setTimeout(async () => {
    await runCoordinatedBilling("initial");
  }, 5000); // Wait 5 seconds after server start

  // Schedule hourly billing (every hour)
  setInterval(async () => {
    await runCoordinatedBilling("scheduled");
  }, 60 * 60 * 1000); // Run every hour (3600000 ms)
}

/**
 * Run billing with daemon coordination
 * Checks if daemon is active before running built-in billing
 */
async function runCoordinatedBilling(runType: "initial" | "scheduled") {
  try {
    // Check if daemon is active
    const isDaemonActive = await DaemonStatusService.isDaemonActive();

    if (isDaemonActive) {
      console.log(
        `⏸️ Billing daemon is active, skipping built-in ${runType} billing (daemon takes priority)`
      );
      return;
    }

    // Daemon is not active, run built-in billing
    console.log(
      `🔄 Billing daemon inactive, running built-in ${runType} billing...`
    );
    const result = await BillingService.runHourlyBilling();
    console.log(
      `✅ Built-in billing completed: ${
        result.billedInstances
      } instances billed, ${result.totalAmount.toFixed(2)} total`
    );

    if (result.failedInstances.length > 0) {
      console.warn(
        `⚠️ ${result.failedInstances.length} instances failed billing:`,
        result.errors
      );
    }
  } catch (error) {
    console.error(`❌ Error in ${runType} billing coordination:`, error);
  }
}

/**
 * close server
 */
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

export default app;
