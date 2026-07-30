FROM node:20-alpine

WORKDIR /app
COPY common ./common
COPY product-service ./product-service
WORKDIR /app/product-service
RUN npm install

EXPOSE 3102
CMD ["npm", "start"]

