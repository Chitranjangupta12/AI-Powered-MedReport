FROM node:20-alpine

WORKDIR /app

# Install build dependencies for native modules if needed
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts

COPY . .

EXPOSE 5000

CMD ["node", "src/server.js"]
