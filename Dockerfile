FROM centos:centos7

RUN yum clean all
RUN yum -y install epel-release; yum clean all
# TEMPORARY until Centos 7.4 is released. https://bugs.centos.org/view.php?id=13669&nbn=1
RUN rpm -ivh https://kojipkgs.fedoraproject.org//packages/http-parser/2.7.1/3.el7/x86_64/http-parser-2.7.1-3.el7.x86_64.rpm
RUN yum -y install bzip2 tar git nodejs npm ImageMagick; yum clean all

RUN npm install grunt-cli -g

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
