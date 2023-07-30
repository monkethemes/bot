FROM node:16.9

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "node", "bot.js" ]
