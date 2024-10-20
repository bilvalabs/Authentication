FROM node:18

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --production

COPY . .

# Change the working directory to /usr/src/app/src
WORKDIR /usr/src/app/src

ENV NODE_ENV=production

EXPOSE 3000

CMD [ "node", "app.js" ]
