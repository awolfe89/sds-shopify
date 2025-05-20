import app from './app';
import config from './config';
import { logger } from './utils/logger';

const { port } = config;

const server = app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection', err);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', err);
  process.exit(1);
});

export default server;