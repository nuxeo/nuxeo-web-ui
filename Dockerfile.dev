FROM node:10

RUN npm config set registry=https://packages.nuxeo.com/repository/npm-all/

WORKDIR /ui

# Copy packages
COPY packages ./packages

# Copy package.json and install dependencies
COPY package*.json ./

RUN npm install

# Copy application source code
COPY . .

EXPOSE 5000

CMD ["npm", "start"]
