/**
 * 인증 플러그인
 * JWT 인증을 Fastify에 등록합니다
 */

import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import jwt from '@fastify/jwt';
import config from '../config';

/**
 * 인증 플러그인
 * JWT 지원과 authenticate 데코레이터를 추가합니다
 */
const authPlugin: FastifyPluginAsync = async fastify => {
  // @fastify/jwt 등록
  await fastify.register(jwt, {
    secret: config.jwt.secret,
    sign: config.jwt.sign,
  });

  // 라우트 보호를 위한 authenticate 데코레이터 추가
  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch (error) {
      reply.code(401).send({
        error: {
          message: '인증이 필요합니다',
          code: 'UNAUTHORIZED',
          statusCode: 401,
        },
      });
    }
  });

  fastify.log.info('JWT 인증 플러그인 등록 완료');
};

// authenticate 데코레이터 타입 선언
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

// 플러그인 캡슐화 방지를 위해 fastify-plugin으로 래핑
export default fp(authPlugin, {
  name: 'auth-plugin',
});
