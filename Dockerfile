FROM node:18.20.4

WORKDIR /app

# Copy package files
COPY package*.json ./

# Disable husky completely
ENV HUSKY=0
ENV DISABLE_HUSKY=1
ENV CI=true

# # Add monaco-editor to package.json before installing
# RUN npm pkg set dependencies.monaco-editor="0.52.0"

# Copy the rest of the application code
COPY . .

# Install dependencies without running scripts
RUN npm install --ignore-scripts

# Expose the port the app runs on
EXPOSE 8888

# Start the application
CMD ["npm", "start"]