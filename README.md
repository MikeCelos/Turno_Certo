# Turno Certo · Backend em Java (Spring Boot)

Calculadora interativa de turnos e suplementos remuneratórios para profissionais de saúde, desenvolvida em **Java 21 / 25** com **Spring Boot 3** e **Maven**.

A aplicação inclui:
1. **Motor de cálculo de alta precisão**: cálculo minuto a minuto com aritmética exata de inteiros (unidades de 1/6000 de cêntimo), eliminando erros de vírgula flutuante.
2. **Tratamento rigoroso de fuso horário**: fuso `Europe/Lisbon`, com validação de mudanças de hora (duração real decorrida, deteção de horas inexistentes na primavera e desambiguação de horas repetidas no outono).
3. **API REST**: endpoint `POST /api/calculate` compatível com a interface web.
4. **Interface Web Integrada**: frontend servido diretamente pelo Spring Boot a partir de `src/main/resources/static/`.
5. **Suíte completa de testes**: 21 testes unitários e de integração em JUnit 5 cobrindo todos os cenários legais e casos de fronteira.

---

## Como Executar

### Pré-requisitos
- Java 21 ou superior (ex: OpenJDK / Temurin)
- Maven 3.9+ (instalado no sistema via Homebrew em `/opt/homebrew/opt/maven`)

### Iniciar o Servidor
Usa o script utilitário incluído:

```sh
./run.sh
```

Ou diretamente com o Maven:

```sh
mvn spring-boot:run
```

Abre no navegador:
👉 **[http://localhost:8080](http://localhost:8080)**

O script mostra também o endereço para acederes a partir do teu telemóvel na mesma rede Wi-Fi (ex: `http://192.168.1.X:8080`).

Para parar o servidor, prime `Ctrl+C`.

---

## Como Instalar (PC, iPhone e Android)

A aplicação é uma **Progressive Web App (PWA)**, permitindo instalação direta em qualquer dispositivo sem precisar de lojas de aplicações:

### 1. No iPhone ou iPad (iOS)
1. No **Safari**, abre o endereço do servidor (ex: `http://<IP-DO-PC>:8080` ou link na nuvem).
2. Toca no botão **Partilhar** (ícone de quadrado com seta para cima: 📤).
3. Desliza para baixo e seleciona **"Adicionar ao Ecrã Principal"** (⊞).
4. Toca em **"Adicionar"** no canto superior direito.
👉 O ícone do **Turno Certo** surge no teu ecrã inicial e abre em ecrã inteiro como uma app nativa!

### 2. No Android
1. No **Google Chrome**, acede ao endereço do servidor.
2. Toca no botão **"Instalar App"** na barra superior ou no menu (⋮) $\rightarrow$ **"Instalar aplicação"** / **"Adicionar ao ecrã inicial"**.
👉 A aplicação é instalada e adicionada à tua lista de aplicações.

### 3. No PC (Windows ou Mac)
1. No **Chrome** ou **Edge**, acede a `http://localhost:8080`.
2. Clica no botão **"Instalar App"** no topo da página ou no ícone de instalação (⊕) na barra de endereços do browser.
👉 O Turno Certo passa a correr como uma aplicação de secretária independente, com janela própria e atalho no Ambiente de Trabalho.

---

## Executar os Testes

Para correr todos os testes unitários e de integração:

```sh
./run.sh test
# ou: mvn test
```

---

## Gerar o JAR Executável

Para compilar e gerar o pacote de produção:

```sh
./run.sh package
# ou: mvn package
```

O ficheiro JAR gerado fica disponível em `target/turno-certo-0.1.0-SNAPSHOT.jar` e pode ser executado autonomamente com:

```sh
./run.sh jar
# ou: java -jar target/turno-certo-0.1.0-SNAPSHOT.jar
```

---

## Estrutura do Código

```
Turno_Certo/
├── pom.xml                                      # Configuração Maven e dependências Spring Boot
├── run.sh                                       # Script utilitário para executar, testar e empacotar
├── README.md                                    # Esta documentação
├── src/
│   ├── main/
│   │   ├── java/com/turnocerto/
│   │   │   ├── TurnoCertoApplication.java       # Ponto de entrada @SpringBootApplication
│   │   │   ├── controller/
│   │   │   │   ├── ShiftCalculatorController.java # Endpoint POST /api/calculate
│   │   │   │   └── GlobalExceptionHandler.java    # Gestão global de erros HTTP 400
│   │   │   ├── dto/
│   │   │   │   ├── CalculateRequest.java        # Dados de entrada do turno e feriados
│   │   │   │   └── ErrorResponse.java           # Formato de resposta de erro JSON
│   │   │   ├── engine/
│   │   │   │   ├── ShiftEngine.java             # Motor de cálculo minuto a minuto
│   │   │   │   └── LisbonTimeUtils.java         # Utilitários de hora de Lisboa e parsing de R
│   │   │   └── model/
│   │   │       ├── Profile.java                 # Perfil com tabelas de coeficientes e horários
│   │   │       ├── Shift.java                   # Modelo do turno a calcular
│   │   │       ├── Segment.java                 # Parcela contígua de trabalho
│   │   │       ├── PaymentMonth.java            # Pagamento agrupado por mês (M+2)
│   │   │       ├── ShiftCalculationResult.java  # Resumo global e detalhado do turno
│   │   │       ├── Window.java                  # Janela horária do dia
│   │   │       └── CategoryRates.java           # Coeficientes da categoria
│   │   └── resources/
│   │       ├── application.properties           # Configuração de porta (8080) e encoding
│   │       └── static/                          # Frontend web (HTML, CSS e JavaScript)
│   │           ├── index.html
│   │           ├── styles.css
│   │           └── app.js
│   └── test/
│       ├── java/com/turnocerto/
│       │   ├── controller/
│       │   │   └── ShiftCalculatorControllerTest.java # Testes de integração MockMvc da API e UI
│       │   └── engine/
│       │       ├── ShiftEngineTest.java         # Testes exaustivos do motor de cálculo
│       │       └── LisbonTimeUtilsTest.java     # Testes de mudanças de hora e parsing
│       └── resources/
│           └── mockito-extensions/              # Configuração de testes para Java 25
```

---

## Regras de Negócio e Aritmética

- **Fórmula de cálculo**: cada minuto é remunerado segundo a fórmula:
  $$\text{minuto} = \frac{\text{rateCents} \times \text{payableCoefficient}}{6000}$$
  sendo acumulado num numerador inteiro em unidades de $1/6000$ de cêntimo.
- **Arredondamento**: ao cêntimo mais próximo com meio cêntimo arredondado para cima:
  $$\text{payableCents} = \left\lfloor \frac{\text{numerator} + 3000}{6000} \right\rfloor$$
- **Previsão de pagamento**: cada parcela é imputada ao mês em que o trabalho foi realizado, com pagamento no mês $M+2$.
- **Primeira hora extra**: no regime extraordinário, os primeiros 60 minutos do turno usam a taxa da primeira hora e não reiniciam à meia-noite nem ao mudar de categoria de período.
- **Regime normal**: desconta-se o $1\text{ R}$ já incluído na remuneração base (`payableCoefficient = coefficient - includedNormal`).
