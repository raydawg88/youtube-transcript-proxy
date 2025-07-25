# Use Node.js base image with Python pre-installed
FROM node:20-slim

# Install Python and pip
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm ci --production

# Copy Python requirements
COPY requirements.txt ./

# Install Python dependencies with --break-system-packages flag
RUN pip3 install --break-system-packages --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 3457

# Start the server
CMD ["node", "index.js"]