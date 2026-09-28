const { app, logger } = require('./app');

if (!process.env.PAYMENT_API_KEY) logger.warn('PAYMENT_API_KEY is not set');

const port = process.env.PORT || 8080;
const server = app.listen(port, () => logger.info(`listening on port ${port}`));

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down');
  server.close(() => process.exit(0));
});

