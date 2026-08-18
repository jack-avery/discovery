.PHONY: initdb seed upgrade front build up down reup

upgrade:
	docker compose run --rm back flask --app run.py db upgrade

seed:
	docker compose run --rm back flask --app run.py seed-dev

initdb: down
	docker compose down -v
	docker compose up -d db
	docker compose run --rm back flask --app run.py db upgrade
	docker compose run --rm back flask --app run.py seed-admin
	$(MAKE) down

build: front
	docker compose build

front:
	cd front && docker run -it --rm -u1000 -v.:/app node:24-alpine sh -c "cd /app && npm i && npm run build"

up:
	docker compose up -d

down:
	docker compose down

reup: down up