# repository rootからWebの本番成果物を作る。API接続先以外の実行環境設定は渡さない。
FROM node:22-bookworm-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee AS build
WORKDIR /build
ENV NEXT_TELEMETRY_DISABLED=1 MINIFLOW_STANDALONE=1
# ブラウザへ公開する値で、秘密は指定しない。変更にはimageの再buildが必要。
ARG NEXT_PUBLIC_API_BASE_URL=/api
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --filter @miniflow/web... --frozen-lockfile --ignore-scripts
COPY apps/web apps/web
COPY packages/shared packages/shared
RUN pnpm --filter @miniflow/web build

FROM node:22-bookworm-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /build/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /build/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
