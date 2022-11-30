install:
	cd frontend && npm install
	cd cmd/mongo-storage && npm install

dev-frontend:
	cd frontend && npm start

build-frontend:
	cd frontend && npm run-script build

DOCKER_IMAGE_FRONTEND=michaeldonat/org-chart-web

build-docker-frontend:
	docker build -t $(DOCKER_IMAGE_FRONTEND) .

docker-push-frontend:
	docker push $(DOCKER_IMAGE_FRONTEND)

dev-mongo-storage:
	cd cmd/mongo-storage && node index.js

DOCKER_IMAGE_MONGO_STORAGE=michaeldonat/org-chart-mongo-storage

build-docker-mongo-storage:
	cd cmd/mongo-storage && docker build -t $(DOCKER_IMAGE_MONGO_STORAGE) .

docker-push-mongo-storage:
	docker push $(DOCKER_IMAGE_MONGO_STORAGE)

build: build-frontend build-docker-frontend build-docker-mongo-storage

push: docker-push-frontend docker-push-mongo-storage
