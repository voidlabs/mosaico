FROM node:6-alpine

RUN apk update && apk add bzip2 tar imagemagick git && npm install grunt-cli -g

# only add package.json so npm install will only be needed if we change it.
COPY package.json /tmp/package.json
# also add bower because package.json post-install needs it.
COPY bower.json /tmp/bower.json
RUN cd /tmp && npm install --unsafe-perm
RUN mkdir -p /opt/mosaico && cp -a /tmp/node_modules /tmp/bower_components /opt/mosaico/ && rm -rf /tmp/node_modules /tmp/bower_components

WORKDIR /opt/mosaico
COPY . /opt/mosaico

EXPOSE 9006

CMD ["grunt", "default"]
