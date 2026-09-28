const { app, logger } = require('./app');

const port = process.env.PORT || 8080;

const server = app.listen(port, () => {
  logger.info({ port }, 'Product service is listening');
});

process.on('SIGTERM', () => {
  logger.info('Shutdown started');
  server.close(() => {
    process.exit(0);
  });
});
