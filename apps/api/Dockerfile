FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --filter @miniflow/api... --frozen-lockfile

COPY apps/api apps/api
COPY packages/shared packages/shared

WORKDIR /app/apps/api

EXPOSE 3001

CMD ["pnpm", "dev"]
