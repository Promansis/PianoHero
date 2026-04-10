FROM node:22-bookworm

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build:web

ENV PORT=3001
ENV PIANOHERO_DATA_DIR=/data

EXPOSE 3001

CMD ["npm", "run", "start:web"]
