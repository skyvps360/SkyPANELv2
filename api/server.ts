/**
 * local server entry file, for local development
 * Updated to trigger restart
 */
import app from './app.js';
import { initSSHBridge } from './services/sshBridge.js';
import { BillingService } from './services/billingService.js';

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
 * Start the hourly billing scheduler
 */
function startBillingScheduler() {
  console.log('🕐 Starting hourly VPS billing scheduler...');
  
  // Run billing immediately on startup (for any missed billing)
  setTimeout(async () => {
    try {
      console.log('🔄 Running initial billing check...');
      const result = await BillingService.runHourlyBilling();
      console.log(`✅ Initial billing completed: ${result.billedInstances} instances billed, $${result.totalAmount.toFixed(2)} total`);
      if (result.failedInstances.length > 0) {
        console.warn(`⚠️ ${result.failedInstances.length} instances failed billing:`, result.errors);
      }
    } catch (error) {
      console.error('❌ Error in initial billing run:', error);
    }
  }, 5000); // Wait 5 seconds after server start
  
  // Schedule hourly billing (every hour)
  setInterval(async () => {
    try {
      console.log('🕐 Running scheduled hourly billing...');
      const result = await BillingService.runHourlyBilling();
      console.log(`✅ Hourly billing completed: ${result.billedInstances} instances billed, $${result.totalAmount.toFixed(2)} total`);
      if (result.failedInstances.length > 0) {
        console.warn(`⚠️ ${result.failedInstances.length} instances failed billing:`, result.errors);
      }
    } catch (error) {
      console.error('❌ Error in scheduled billing run:', error);
    }
  }, 60 * 60 * 1000); // Run every hour (3600000 ms)
}

/**
 * close server
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;