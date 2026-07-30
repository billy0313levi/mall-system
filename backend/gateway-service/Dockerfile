FROM node:20-alpine

WORKDIR /app
COPY common ./common
COPY gateway-service ./gateway-service
WORKDIR /app/gateway-service
RUN npm install

EXPOSE 3000
CMD ["npm", "start"]

