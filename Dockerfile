# Use an official Node.js runtime as the base image
FROM node:20-alpine

# Install bash
RUN apk update && apk add --no-cache bash

# Set the working directory in the container to /app
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the application's dependencies inside the Docker image
RUN npm install

# Copy the rest of the application's code to the working directory
COPY . .

# Copy wait-for-mysql.sh script and make it executable
COPY wait-for-mysql.sh /usr/local/bin/wait-for-mysql.sh
RUN chmod +x /usr/local/bin/wait-for-mysql.sh

# Expose port 3000 to the outside world
EXPOSE 3000

# Start the application
CMD [ "npm", "start" ]