FROM node:22-bookworm

WORKDIR /app

COPY package*.json ./
COPY scripts ./scripts
ENV LUMAKEYS_SKIP_ELECTRON_REBUILD=1
RUN npm ci
RUN npm rebuild better-sqlite3

COPY electron.vite.config.ts vite.web.config.ts tsconfig.json tsconfig.server.json vite-env.d.ts ./
COPY src ./src
COPY public ./public

RUN npm run build:web

ENV PORT=3001
ENV LUMAKEYS_DATA_DIR=/data

EXPOSE 3001

CMD ["npm", "run", "start:web"]
