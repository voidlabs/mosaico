FROM    centos:centos6

# Enable Extra Packages for Enterprise Linux (EPEL) for CentOS
RUN     yum install -y epel-release
# Install Node.js and npm
RUN     yum install -y git nodejs npm  ImageMagick bzip2 tar

# Install app dependencies
COPY package.json /src/package.json
RUN npm install grunt-cli -g

RUN cd /src; npm install; 


# Bundle app source
COPY . /src


WORKDIR /src

EXPOSE  9006
CMD ["grunt"]
