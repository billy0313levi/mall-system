FROM node:20-alpine

WORKDIR /app
COPY common ./common
COPY user-service ./user-service
WORKDIR /app/user-service
RUN npm install

EXPOSE 3101
CMD ["npm", "start"]

