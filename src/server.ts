/**
 * 서버 진입점
 * Fastify 서버를 시작하고 graceful shutdown을 처리합니다
 */

import buildApp from './app';
import config from './config';

/**
 * 서버 시작
 */
async function start(): Promise<void> {
  const app = buildApp();

  try {
    // 모든 플러그인이 로드될 때까지 대기
    await app.ready();

    // 서버 시작
    await app.listen({
      host: config.server.host,
      port: config.server.port,
    });

    const address = app.server.address();
    const addressInfo =
      typeof address === 'string' ? address : `${address?.address}:${address?.port}`;
    app.log.info(`서버가 ${addressInfo}에서 실행 중입니다`);
  } catch (error) {
    app.log.error({ err: error }, '서버 시작 에러');
    process.exit(1);
  }

  // Graceful shutdown 핸들러
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

  signals.forEach(signal => {
    process.on(signal, async () => {
      app.log.info(`${signal} 신호를 받아 graceful shutdown을 시작합니다`);

      try {
        await app.close();
        app.log.info('서버가 정상적으로 종료되었습니다');
        process.exit(0);
      } catch (error) {
        app.log.error({ err: error }, '종료 중 에러 발생');
        process.exit(1);
      }
    });
  });

  // 예상치 못한 에러 처리
  process.on('uncaughtException', error => {
    app.log.error({ err: error }, 'Uncaught exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    app.log.error({ reason, promise }, 'Unhandled rejection');
    process.exit(1);
  });
}

// 이 파일이 직접 실행될 때만 서버 시작
if (require.main === module) {
  void start();
}

export default start;
