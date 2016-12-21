FROM centos:centos7

RUN yum clean all
RUN yum -y install epel-release; yum clean all
RUN yum -y install bzip2 tar git nodejs npm ImageMagick; yum clean all

RUN npm install grunt-cli -g

RUN mkdir -p /usr/src/mosaico
COPY . /usr/src/mosaico
WORKDIR /usr/src/mosaico
RUN npm install --verbose

EXPOSE 9006

CMD ["grunt", "test", "default"]