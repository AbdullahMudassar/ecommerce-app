const { app, logger, redis } = require('./app');

redis.connect().catch((err) => logger.error({ err: err.message }, 'redis connect failed'));

const port = process.env.PORT || 8080;
const server = app.listen(port, () => logger.info(`listening on port ${port}`));

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down');
  server.close(async () => {
    await redis.quit().catch(() => {});
    process.exit(0);
  });
});

