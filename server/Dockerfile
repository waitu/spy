from node:20-alpine

workdir /app

copy package*.json ./
run npm install

copy server ./server

expose 4000

cmd ["npm", "run", "dev:api"]
