FROM node:20-alpine

WORKDIR /app
COPY common ./common
COPY payment-service ./payment-service
WORKDIR /app/payment-service
RUN npm install

EXPOSE 3105
CMD ["npm", "start"]

