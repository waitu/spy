from node:20-alpine

workdir /app

copy package*.json ./
run npm install

copy . .

expose 4173

cmd ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
