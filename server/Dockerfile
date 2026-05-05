FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY server ./server
COPY scripts ./scripts

EXPOSE 4000

CMD ["npm", "run", "dev:api"]
