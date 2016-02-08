all: build run

build:
	docker build -t piotr-mroczek/mosaico .

run:
	docker run -p 9006:9006 piotr-mroczek/mosaico	



