FROM node:18

WORKDIR /app

# Copy package files
COPY package*.json ./

# Disable husky completely
ENV HUSKY=0
ENV DISABLE_HUSKY=1
ENV CI=true

# Add monaco-editor to package.json before installing
RUN npm pkg set dependencies.monaco-editor="0.52.0"

# Install dependencies without running scripts
RUN npm ci --ignore-scripts

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 8888

# Start the application
CMD ["npm", "start"]