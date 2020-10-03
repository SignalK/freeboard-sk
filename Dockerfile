FROM node

RUN npm i -g @angular/cli@latest

RUN mkdir /app/
WORKDIR /app/

COPY package.json /app/
RUN npm i

COPY . /app/

CMD ["npm", "start"]
