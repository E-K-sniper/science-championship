# Science Championship — unified image (client build + API server)
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm --prefix server install --no-audit --no-fund \
 && npm --prefix client install --no-audit --no-fund

COPY server/ server/
COPY client/ client/
RUN npm --prefix client run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 8000
CMD ["node", "server/src/index.js"]
