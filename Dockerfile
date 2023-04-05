FROM --platform=linux/amd64 node:18-alpine as ts-compiler
WORKDIR /usr/app
COPY package*.json ./
COPY tsconfig*.json ./
COPY yarn.lock ./
RUN yarn
COPY . ./
RUN npx prisma generate
RUN yarn build

FROM --platform=linux/amd64 node:18-alpine as ts-remover
WORKDIR /usr/app
COPY --from=ts-compiler /usr/app/package*.json ./
COPY --from=ts-compiler /usr/app/yarn.lock ./
COPY --from=ts-compiler /usr/app/build ./build
COPY --from=ts-compiler /usr/app/public ./public
COPY --from=ts-compiler /usr/app/prisma ./prisma
RUN yarn --production

FROM --platform=linux/amd64 node:18-alpine
RUN apk add --update openssl && rm -rf /var/cache/apk/*
WORKDIR /usr/app
COPY --from=ts-remover /usr/app ./
USER 1000
EXPOSE 3000
CMD ["yarn", "start:docker"]

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://localhost:3000/health || exit 1
