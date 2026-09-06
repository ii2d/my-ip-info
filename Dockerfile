FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod

COPY tsconfig.json ./
COPY src/shared ./src/shared
COPY src/server ./src/server

EXPOSE 3000
CMD ["npx", "tsx", "src/server/node.ts"]
