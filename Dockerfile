FROM node:22-bookworm

WORKDIR /app

COPY package*.json ./
COPY scripts ./scripts
ENV PIANOHERO_SKIP_ELECTRON_REBUILD=1
RUN npm ci
RUN npm rebuild better-sqlite3

COPY . .

RUN npm run build:web

ENV PORT=3001
ENV PIANOHERO_DATA_DIR=/data

EXPOSE 3001

CMD ["npm", "run", "start:web"]
