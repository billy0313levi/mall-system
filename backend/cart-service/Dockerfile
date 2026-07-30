FROM node:20-alpine

WORKDIR /app
COPY common ./common
COPY cart-service ./cart-service
WORKDIR /app/cart-service
RUN npm install

EXPOSE 3103
CMD ["npm", "start"]

