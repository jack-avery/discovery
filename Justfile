default_env := "local"

initdb ENV=default_env:
    #!/usr/bin/env bash
    just down {{ENV}}
    COMPOSE="docker compose -f ./conf/{{ENV}}/docker-compose.yml"
    $COMPOSE create db
    $COMPOSE start db
    $COMPOSE cp ./db/schema.sql db:/schema.sql
    echo "Waiting 5 seconds for PG to start..."
    sleep 5
    $COMPOSE exec db /bin/sh -c 'mysql < schema.sql'
    $COMPOSE exec db rm schema.sql
    just down {{ENV}}
    echo "Database created and ready to use"

up ENV=default_env:
    #!/usr/bin/env bash
    docker compose -f ./conf/{{ENV}}/docker-compose.yml up -d

down ENV=default_env:
    #!/usr/bin/env bash
    docker compose -f ./conf/{{ENV}}/docker-compose.yml down

reup ENV=default_env:
    #!/usr/bin/env bash
    just down {{ENV}}
    just up {{ENV}}
