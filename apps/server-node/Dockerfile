FROM node:20-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/core ./packages/core
COPY apps/server-node ./apps/server-node

RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @my-ip/core build
RUN pnpm --filter @my-ip/server-node build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server-node/dist ./dist
COPY --from=builder /app/apps/server-node/package.json ./apps/server-node/package.json

EXPOSE 3000
CMD ["node", "dist/index.js"]
