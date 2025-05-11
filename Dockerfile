FROM node:22
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 3001

RUN npm run build

CMD ["npm", "start"]