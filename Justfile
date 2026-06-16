initdb:
    #!/usr/bin/env bash
    just down
    docker rm discovery_mysql-data
    docker compose create db
    docker compose start db
    docker compose cp ./db/schema.sql db:/schema.sql
    echo "Waiting 10 seconds for MySQL to start..."
    sleep 10
    docker compose exec db /bin/sh -c 'mysql < schema.sql'
    docker compose exec db rm schema.sql
    just down
    echo "Database created and ready to use"

front:
    #!/usr/bin/env bash
    cd front && docker run -it --rm -u1000 -v.:/app node:24-alpine sh -c "cd /app && npm i && npm run build"

up:
    #!/usr/bin/env bash
    docker compose up -d

down:
    #!/usr/bin/env bash
    docker compose down

reup:
    #!/usr/bin/env bash
    docker compose down
    docker compose up -d
