FROM centos:centos7

RUN yum clean all
RUN yum -y install epel-release; yum clean all
RUN yum -y install bzip2 tar git nodejs npm ImageMagick; yum clean all

RUN npm install grunt-cli -g

ADD package.json /tmp/package.json
RUN cd /tmp && npm install
RUN mkdir -p /opt/mosaico && cp -a /tmp/node_modules /tmp/bower_components /opt/mosaico/

WORKDIR /opt/mosaico
ADD . /opt/mosaico

EXPOSE 9006

CMD ["grunt", "test", "default"]
