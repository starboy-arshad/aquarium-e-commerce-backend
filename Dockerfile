# Use Node.js 18 Alpine image for production
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first to leverage Docker layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --no-optional && npm cache clean --force

# Verify production dependencies are installed
RUN npm list --depth=0 --production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001

# Copy application code
COPY . .

# Create uploads directory and set permissions
RUN mkdir -p uploads && chown -R nodeuser:nodejs uploads

# Change ownership of app directory
RUN chown -R nodeuser:nodejs /app

# Switch to non-root user
USER nodeuser

# Expose port 5000
EXPOSE 5000

# Start the application
CMD ["npm", "start"]

