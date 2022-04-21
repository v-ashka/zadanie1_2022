# FROM node:17-slim
# WORKDIR /var/node
# ADD server ./
# RUN ls -la
# RUN npm install
# # RUN cd /server
# CMD npm run dev

FROM scratch AS builder
LABEL Autor: "Marcin Wijaszka"
ADD "alpine-minirootfs-3.15.2-x86_64.tar.gz" /
RUN echo "http://dl-cdn.alpinelinux.org/alpine/v$(cat /etc/alpine-release | cut -d'.' -f1,2)/main" >> /etc/apk/repositories; \
    echo "http://dl-cdn.alpinelinux.org/alpine/v$(cat /etc/alpine-release | cut -d'.' -f1,2)/community" >> /etc/apk/repositories; 
CMD ["apk", "update"]

FROM builder
RUN apk add --update nodejs npm
WORKDIR /app
COPY server/package*.json ./
RUN npm ci
COPY server/ .
RUN ls -la
RUN cat package.json
EXPOSE 3000
CMD ["node", "index.js"]
