FROM node:7

RUN apt-get install -y ImageMagick

ADD . /opt/mosaico
WORKDIR /opt/mosaico

RUN  npm install grunt-cli -g \
 && npm install \
 && npm cache clear

EXPOSE 9006

CMD ["grunt", "test", "default"]
