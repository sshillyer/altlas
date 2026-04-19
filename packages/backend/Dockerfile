FROM node:22-alpine

RUN apk add --no-cache python3 make g++
RUN corepack enable

WORKDIR /app

COPY pnpm-workspace.yaml package.json ./
COPY packages/backend/package.json ./packages/backend/

RUN pnpm install --no-frozen-lockfile

COPY packages/backend ./packages/backend

RUN pnpm --filter backend build

EXPOSE 3001

CMD ["node", "packages/backend/dist/main.js"]
