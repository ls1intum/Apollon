FROM node:18-alpine

WORKDIR /app

COPY . .

RUN apk add thttpd

RUN yarn install && yarn build
RUN mv /app/dist /static && rm -rf /app

WORKDIR /static

EXPOSE 8888/tcp

CMD ["thttpd", "-D", "-h", "0.0.0.0", "-p", "8888", "-d", "/static", "-l", "-", "-M", "60"]
