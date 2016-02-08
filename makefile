all: build run

build:
	docker build -t piotrmroczek/mosaico .

run:
	docker run -d -p 9006:9006 --name mosaico-node1 piotrmroczek/mosaico	



