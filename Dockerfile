# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY client/package*.json ./client/

# Install root dependencies
RUN npm install

# Install client dependencies
WORKDIR /app/client
RUN npm install

# Go back to root and copy source code
WORKDIR /app
COPY . .

# Build the client (vite is now available)
WORKDIR /app/client
RUN npm run build

# Go back to root for runtime
WORKDIR /app

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
