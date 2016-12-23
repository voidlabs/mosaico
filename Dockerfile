FROM centos:centos7

RUN yum clean all
RUN yum -y install epel-release; yum clean all
RUN yum -y install bzip2 tar git nodejs npm ImageMagick; yum clean all

RUN npm install grunt-cli -g

RUN mkdir -p /opt/mosaico
ADD . /opt/mosaico
RUN cd /opt/mosaico && npm install --unsafe-perm

EXPOSE 9006

WORKDIR /opt/mosaico
CMD ["grunt", "test", "default"]