FROM node:22
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

RUN apt-get update && apt-get install -y netcat-openbsd && rm -rf /var/lib/apt/lists/*

COPY . .

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

RUN npx prisma generate

RUN npm run build

EXPOSE 3001

ENTRYPOINT ["./entrypoint.sh"]
CMD ["npm", "start"]