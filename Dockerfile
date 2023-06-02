FROM node:16 AS base

# Create app directory
WORKDIR /usr/src/app

COPY ./src/* src/*
COPY package.json package.json

RUN npm run build

ENTRYPOINT ["dist/index.js"]