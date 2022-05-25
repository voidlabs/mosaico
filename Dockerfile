FROM node:16-alpine

RUN apk update
RUN apk add bzip2 tar git

RUN npm install grunt-cli -g

# only add package.json so npm install will only be needed if we change it.
COPY package.json /tmp/package.json
RUN cd /tmp && npm install --unsafe-perm
RUN mkdir -p /opt/mosaico && cp -a /tmp/node_modules /opt/mosaico/ && rm -rf /tmp/node_modules

WORKDIR /opt/mosaico
COPY . /opt/mosaico

EXPOSE 9006

CMD ["grunt", "default"]
