#!/usr/bin/env bash
set -e

# Configurar Java Homebrew se necessário
if [ -d "/opt/homebrew/opt/openjdk/bin" ]; then
    export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"
fi

if [ -z "$JAVA_HOME" ] && [ -d "/Library/Java/JavaVirtualMachines/temurin-25.jdk/Contents/Home" ]; then
    export JAVA_HOME="/Library/Java/JavaVirtualMachines/temurin-25.jdk/Contents/Home"
fi

MVN_BIN="mvn"
if command -v /opt/homebrew/opt/maven/bin/mvn &>/dev/null; then
    MVN_BIN="/opt/homebrew/opt/maven/bin/mvn"
fi

ACTION="${1:-run}"

case "$ACTION" in
    test)
        echo "A executar testes unitários..."
        "$MVN_BIN" test
        ;;
    package)
        echo "A compilar e empacotar Turno Certo JAR..."
        "$MVN_BIN" package
        ;;
    run|start)
        LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "IP_DO_PC")
        echo "=========================================================="
        echo " Turno Certo · Servidor a Iniciar"
        echo "=========================================================="
        echo " 👉 No teu PC:                           http://localhost:8080"
        echo " 👉 No teu iPhone / Android (mesmo Wi-Fi): http://${LOCAL_IP}:8080"
        echo "=========================================================="
        "$MVN_BIN" spring-boot:run
        ;;
    jar)
        if [ ! -f "target/turno-certo-0.3.0-SNAPSHOT.jar" ]; then
            "$MVN_BIN" package -DskipTests
        fi
        LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "IP_DO_PC")
        echo "=========================================================="
        echo " Turno Certo · Servidor JAR Autónomo"
        echo "=========================================================="
        echo " 👉 No teu PC:                           http://localhost:8080"
        echo " 👉 No teu iPhone / Android (mesmo Wi-Fi): http://${LOCAL_IP}:8080"
        echo "=========================================================="
        java -jar target/turno-certo-0.3.0-SNAPSHOT.jar
        ;;
    docker)
        echo "A construir imagem Docker turnocerto:latest ..."
        docker build -t turnocerto:latest .
        echo "A executar contentor Docker..."
        docker run -p 8080:8080 --name turnocerto --rm turnocerto:latest
        ;;
    *)
        echo "Uso: ./run.sh [run|test|package|jar|docker]"
        exit 1
        ;;
esac
