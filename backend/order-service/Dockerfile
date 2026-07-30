FROM node:20-alpine

WORKDIR /app
COPY common ./common
COPY order-service ./order-service
WORKDIR /app/order-service
RUN npm install

EXPOSE 3104
CMD ["npm", "start"]

