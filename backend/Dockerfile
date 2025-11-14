FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Build and start server
# Build happens at startup to ensure dist folder is created with volume mounts
CMD ["sh", "-c", "npm run build && npm start"]
