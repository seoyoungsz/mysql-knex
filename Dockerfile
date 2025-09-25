# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /usr/src/app

FROM base AS deps
COPY package*.json ./
RUN npm install

FROM deps AS development
COPY . .
CMD ["npm", "run", "dev"]

FROM deps AS build
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

FROM base AS production
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /usr/src/app/dist ./dist
CMD ["node", "dist/server.js"]
