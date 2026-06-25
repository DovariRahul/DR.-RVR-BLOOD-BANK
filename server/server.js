const app = require('./src/app');
const { logger } = require('./src/utils/logger');
const { testConnection } = require('./src/config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test database connection
    await testConnection();
    logger.info('Database connection established successfully.');

    app.listen(PORT, () => {
      logger.info(`RVR Blood Bank API running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
