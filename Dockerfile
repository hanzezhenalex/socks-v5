FROM node:18 AS base

# Create app directory
WORKDIR /usr/src/app

COPY package.json package.json
COPY package-lock.json package-lock.json

COPY . .

RUN npm run build

ENTRYPOINT ["node","dist/index.js"]