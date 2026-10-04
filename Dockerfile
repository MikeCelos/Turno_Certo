# Estágio 1: Build com Maven e Eclipse Temurin 21
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Estágio 2: Imagem leve de execução com JRE 21 Alpine (~140MB)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/turno-certo-*.jar app.jar
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
