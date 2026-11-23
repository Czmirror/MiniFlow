# repository rootをcontextにしてAPIの本番成果物を作る。秘密は実行環境だけから渡す。
# 公式Node 22 bookworm-slimのmulti-platform manifestを固定する。
FROM node:22-bookworm-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS build
WORKDIR /build
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --filter @miniflow/api... --frozen-lockfile --ignore-scripts
COPY apps/api/src apps/api/src
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY apps/api/prisma apps/api/prisma
COPY packages/shared/src packages/shared/src
COPY packages/shared/tsconfig.json packages/shared/tsconfig.json
RUN pnpm db:generate && pnpm --filter @miniflow/api build
# workspace設定を変更せず本番依存だけを分離し、分離先でPrisma Clientを生成する。
RUN pnpm --filter @miniflow/api deploy --legacy --prod --ignore-scripts /out \
  && pnpm --filter @miniflow/api exec prisma generate --schema=/out/prisma/schema.prisma

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/package.json ./package.json
COPY --from=build /build/apps/api/dist ./dist
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
