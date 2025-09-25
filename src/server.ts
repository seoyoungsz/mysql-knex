import buildApp from './app';
import { env } from './config/env';

/**
 * Fastify 서버를 기동하고 예외를 로깅한 뒤 비정상 종료를 처리합니다.
 */
async function start(): Promise<void> {
  const app = await buildApp();

  try {
    await app.listen({ port: env.port, host: env.host });
    app.log.info(`Server listening on ${env.host}:${env.port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
