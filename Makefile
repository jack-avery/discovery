.PHONY: initdb importsampledata front up down reup

initdb: down
	docker volume rm discovery_mysql-data
	docker compose create db
	docker compose start db
	docker compose cp ./db/schema.sql db:/schema.sql
	# the image starts an initial temp server for an empty vol. wait for this to close
	docker logs -f discovery-db-1 2>&1 | sed -e '/Temporary server stopped/q'
	# now we can wait for the ready signal
	docker logs -f discovery-db-1 2>&1 | sed -e '/ready for connections/q'
	# sleep another 2 seconds just to be sure?
	sleep 2
	docker compose exec db /bin/sh -c 'mysql < schema.sql'
	docker compose exec db rm schema.sql
	make down

importsampledata: down
	docker compose create db
	docker compose start db
	docker compose cp ./db/sampledata.sql db:/sampledata.sql
	# the image starts an initial temp server for an empty vol. wait for this to close
	docker logs -f discovery-db-1 2>&1 | sed -e '/Temporary server stopped/q'
	# now we can wait for the ready signal
	docker logs -f discovery-db-1 2>&1 | sed -e '/ready for connections/q'
	# sleep another 2 seconds just to be sure?
	sleep 2
	docker compose exec db /bin/sh -c 'mysql < sampledata.sql'
	docker compose exec db rm sampledata.sql
	make down

front:
	cd front && docker run -it --rm -u1000 -v.:/app node:24-alpine sh -c "cd /app && npm i && npm run build"

up: front
	docker compose up -d

down:
	docker compose down

reup:
	docker compose down
	docker compose up -d
