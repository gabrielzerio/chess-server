FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

RUN npx prisma generate

RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]