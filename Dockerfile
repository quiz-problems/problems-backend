FROM node:19-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port 5000
EXPOSE 5000

# Start the app
CMD ["npm", "start"] 