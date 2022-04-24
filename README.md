# Zadanie nr. 1 - LABORATORIUM PROGRAMOWANIA APLIKACJI W CHMURACH OBLICZENIOWYCH

- [1. Część obowiązkowa](#czesc-obow)
    - [1. Program serwera](#program-serwera)
    - [2. Dockerfile ](#dockerfile)
    - [3. Różne architektury](#architektury)
- [2. Część dodatkowa](#czesc-dodatkowa)
    - [1. Dodatek 1](#dodatek1)
    - [2. Dodatek 2](#dodatek2)

## <a name="czesc-obow"></a>Część obowiązkowa

### <a name="program-serwera"></a> 1. Program serwera 
Serwer został napisany w node.js, z dodatkowo zaimportowanym modułem express i fs do obsługi plików

```javascript

// zaimportowanie niezbędnych modułów
const express = require('express')
const app = express()
const fs = require('fs');
const https = require('https')
const http = require('http')
app.use(express.json())
// port na jakim uruchomi się serwer
const PORT = process.env.PORT || 3000

// zewnętrzna funkcja służąca do wyświetlenia daty wraz z godziną uruchomienia serwera przez klienta
const accDate = require('./server-files/getDate');
const newline = '\n';

// zmienna przechowywująca tekst, który to zostanie wyświetlony w konsolii oraz zapisany w pliku z logami po uruchomieniu serwera
const serverRunInfo = `|${accDate()}|| Marcin Wijaszka | Serwer został uruchomiony na porcie ${PORT}`
// ścieżka pliku z logami serwera
const path = './serverlogs.txt'

// zmienna url przechowuje adres do którego wykonywane będzie zapytanie w celu otrzymania zewnętrznego adresu IP
const url = 'https://myexternalip.com/json'


// przy jakiejkolwiek próbie połączenia z localhostem, zostanie wykonana następująca funkcja:

app.use(async function (request, response, next) {
    // wykonuje się pierwszy fetch na stronę podaną w zmiennej URL
    return https.get(url, res => {
        let data = '';      
        res.on('data', chunk => {
        // jeżeli są jakieś dane, to zostają zapisane i dodane do zmiennej
          data += chunk;
        });
        res.on('end', () => {
        // przy sukcesywnym połączeniu dane zostaną sparsowane a do zmiennej ip zostanie wyciągniete to co najważniejsze, czyli zewnętrzny adres IP
          data = JSON.parse(data);
          const ip = data.ip;
          
          // w tym miejscu wykonuje się kolejny 2 fetch na stronę, która pozwoli uzyskać informację na temat geolokalizacji klienta oraz udostępni jego lokalny czas
           http.get(`http://ip-api.com/json/${ip}`, res => {
            let geoData = '';      
            res.on('data', chunk => {
            // ponownie jeżeli występują jakieś dane zostają one zapisane i dodane do zmiennej geoData
              geoData += chunk;
            });
            res.on('end', () => {
            
            // dane zostają przeparsowane w celu możliwości ich odczytania
              geoData = JSON.parse(geoData);
            // obiekt przechowujący właściwości dot. wyświetlenia czasu klienta
            let options = {
                timeZone: `${geoData.timezone}`,
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
              },
              // format daty i godziny aby był on bardziej przejrzysty dla użytkownika
              formatter = new Intl.DateTimeFormat([], options);
              
              // zapisanie do zmiennej wynikowego tekstu, zawierającego konkretną datę adres klienta jego lokalizacja oraz lokalny czas
              userRegionInfo = `|${accDate()}| ${ request.method } | Adres IP klienta: ${ip} | lokalizacja: ${geoData.country} | lokalny czas klienta: ${formatter.format(new Date())}`;
              
              // w tym miejscu następuje zapis do pliku o zmiennej "path"
              fs.appendFile(path, userRegionInfo+newline, (err) => {
                  // jeżeli doszło do błedu wyrzuci błąd
                  if (err) throw err;
                  // wyświetli w konsoli informacje zapisane w zmiennej powyżej
                  console.log(userRegionInfo);
              });
              // response.send odpowiada za wyświetlenie identycznych danych w przeglądarce
              response.send(`${userRegionInfo}`);
            })
          }).on('error', err => {
          // jeżeli wystąpił błąd związany z geolokalizacją, w konsoli zostanie wyświetlony komunikat poniżej
            console.log(`Can't get geolocation! ${err.message}`);
          })

        })
      }).on('error', err => {
      // jeżeli wystąpi bład związany z pobraniem danych o zewnętrznbym adresie IP zostanie wyświetlony bląd poniżej
       console.log(`Can't get IP address: ${err.message}`);
      })

  next()

})

// nasłuchuje na odpowiednim porcie i wyświetla informacje kto i o której uruchomił serwer
app.listen(PORT, () => console.log(serverRunInfo));

// funkcja poniżej zapisuje informacje o uruchomieniu serwera do pliku o zmiennej path
fs.appendFile(path, serverRunInfo+newline, (err) => {

    // throws an error, you could also catch it here
    if (err) throw err;
    // success case, the file was saved
});
```

Do przeprowadzenia testów związnaych ze zmianą zewnętrzne adresu IP, użyto darmowego programu Proton VPN, umożliwiającego korzystanie z wielu zew. adresów IP.
Poniższy zrzut ekranu przedstawia działanie programu z widoku konsoli.
![image](https://user-images.githubusercontent.com/47278535/164990519-607dfa31-934e-487d-840e-8934eb5ddb6d.png)
W przeglądarce zaś wygląda to następująco
![image](https://user-images.githubusercontent.com/47278535/164990691-44bb4d32-4b06-46d7-bdbf-eadce871eaa7.png)
![image](https://user-images.githubusercontent.com/47278535/164990732-2d86fc6a-5139-41bb-9064-203f391968db.png)

### <a name="dockerfile"></a> 2. i 3. Opracowanie plik Dockerfile i jego uruchomienie wraz z ustawieniem
Dla celów laboratorium plik dockerfile został podzielony na sekcję buildera, który to pobierze alpine z pliku znajdującego się w lokalnym folderze użytkownika, zainstaluje go oraz wykona update.
Kolejna część zajmuje się kwestią instalacji nodejs w wersji mocno okrojonej, co pozwoli zredukować wagę kontenera z 260MB do 62MB.
Plik został stworzony w taki sposób aby wykorzystać warstwę scratch wraz z wieloetapowym budowaniem obrazu
```Dockerfile
FROM scratch AS builder
LABEL Autor: "Marcin Wijaszka"
ADD "alpine-minirootfs-3.15.2-x86_64.tar.gz" /
RUN echo "http://dl-cdn.alpinelinux.org/alpine/v$(cat /etc/alpine-release | cut -d'.' -f1,2)/main" >> /etc/apk/repositories; \
    echo "http://dl-cdn.alpinelinux.org/alpine/v$(cat /etc/alpine-release | cut -d'.' -f1,2)/community" >> /etc/apk/repositories; 
CMD ["apk", "update"]

FROM builder
RUN apk add --update nodejs npm
#utworznie work directory
WORKDIR /app
#kopia z ktalogu serwer plików package.json do podanego workdira
COPY server/package*.json ./
#uruchomienie npm'a
RUN npm ci
#kopia katalogu serwer do workdir
COPY server/ .
EXPOSE 3000
#uruchomienie serwera [pliku index.js]
CMD ["node", "index.js"]
```

#### Wykorzystane polecenia:
a. zbudowanie opracowanego obrazu kontenera
```
DOCKER_BUILDKIT=1 docker build -t node_server .
```
![image](https://user-images.githubusercontent.com/47278535/164991729-d1cdb9d3-5f2b-460a-ad6e-3704b1fa4d4f.png)
b. c. uruchomienie kontenera na podstawie zbudowanego obrazu i uzyskanie informacji, które wygenerował serwer w trakcie uruchomienia konterna
```
docker run -t --name zadanie1_node -p 3000:3000 node_server
```
![image](https://user-images.githubusercontent.com/47278535/164991897-7acf95ef-0202-46d5-a4fa-d35cad4c8aaa.png)

d. sprawdzenie ile warstw posiada zbudowany obraz
(za pomocą docker history)
```
docker image history node_server:latest
```
![image](https://user-images.githubusercontent.com/47278535/164991986-6ce6ffcc-53da-415d-9e9f-f88b61dd8460.png)

(za pomocą docker image inspect)
```
docker image inspect node_server:latest
```
![image](https://user-images.githubusercontent.com/47278535/164992005-15feb693-d85d-43e9-9c7d-9e5ab3a153e9.png)

W finalnej wersji obraz stworzonego serwera w nodejs zajmuje ```62.1MB``` co jak na serwer w nodejs, wydaje się być dobrym wynikiem.

### <a name="architektury"></a> 4. Zbudowanie obrazów na różnych architekturach
W celu instalacji 3 podanych w zadaniu architektur **linux/arm/v7, linux/arm64/v8** oraz **linux/amd64**, na początku należy upewnić się czy emulator zasobów QEMU, jest już zainstalowany, jeżeli nie to:
```
sudo apt-get install qemu-user-static
```
Po zainstalowaniu tworzymy nowy builder buildx, i ustawiamy go jako domyślny
```
docker buildx create --name node_server_builder
docker buildx use node_server_builder
```
Następnie budujemy obraz serwera na wcześniej wspomniane platformy i wrzucamy go na Dockerhub
```
docker buildx build -t vashka99/zadanie1:multi --platform linux/amd64,linux/arm64/v8,linux/arm/v7 --push .
```

![image](https://user-images.githubusercontent.com/47278535/164992464-287b1f1f-dde4-42ee-b6fc-183cd94ef1b6.png)
Jeżeli wszystko przebiegło pomyślnie na podanym repozytorium na dockerhub powinno znajdować się nowe repo, z trzema architekturami
![image](https://user-images.githubusercontent.com/47278535/164992589-ee58e64e-1040-46d0-9d7b-a79c7fab8a22.png)
![image](https://user-images.githubusercontent.com/47278535/164992591-25625cad-4cb6-4019-8948-5be47f7a11ff.png)

Utworzone repozytorium można znaleźć pod tym [linkiem](https://hub.docker.com/repository/docker/vashka99/zadanie1)

## <a name="czesc-dodatkowa"></a> Część dodatkowa

### <a name="dodatek1"></a> DODATEK 1
#zad1-dod
### Wykonanie punktu **4.** z wykorzystaniem Github Actions
Dla podanego zadania został utworzony plik ***main.yml***, który to zostanie wykorzystany do buildowania w Github Actions
Utworzony plik został już podzielony na część związaną z cache'owaniem oraz z przesyłaniem danych na github, zamiast na dockerhub'a.

**main.yml - całość bez cache'owania**
```yml
name: Zadanie1 with Github Actions

# Controls when the workflow will run
on:
  # Triggers the workflow on push or pull request events but only for the main branch
  push:
    branches:
    - main
    paths-ignore:
    - '**/README.md'


# A workflow run is made up of one or more jobs that can run sequentially or in parallel
jobs:
  # This workflow contains a single job called "build"
  build-push-images:
    # The type of runner that the job will run on
    name: Build and push to ubuntu
    runs-on: ubuntu-latest

    # Steps represent a sequence of tasks that will be executed as part of the job
    steps:
      # Checks-out your repository under $GITHUB_WORKSPACE, so your job can access it
      #Sprawdzenie kodu, ustawienie QEMU, oraz buildx
      - name: Check code
        uses: actions/checkout@v3
      # docker setups
      - name: Setup QEMU
        uses: docker/setup-qemu-action@v1
      
      - name: Setup docker buildx
        id: buildx
        uses: docker/setup-buildx-action@v1
      #Logowanie do githuba
      - name: Login to github
        uses: docker/login-action@v1
        with:
          #wykorzystanie Github Container Registry w celu logowania
          registry: ghcr.io
          #nazwa użytkownika 
          username: ${{github.actor}}
          # hasło zapisane w postaci tokena który to jest przechowywany w zmiennej globalnej GITHUB_TOKEN
          password: ${{secrets.GITHUB_TOKEN}}
         # zbuildowanie obrazu i push
      - name: Build and push 
        id: docker_build
        uses: docker/build-push-action@v2
        with:
        #z jakiego folderu ma być kontekst
          context: ./
          # ścieżka do pliku wykonywalnego dockerfile
          file: ./Dockerfile
          # wskazanie odpowiednich platform
          platforms: linux/amd64,linux/arm64/v8,linux/arm/v7
          push: true
          #pod jaką ścieżką na github container registry ma zostać pushownay obraz
          tags: ghcr.io/v-ashka/zadanie1_2022:latest
```

Dodanie cache'owania - linijki związane z cache'em zostały umieszczone w trakcie Build'u i pushownia
```yml
      - name: Build and push 
        id: docker_build
        uses: docker/build-push-action@v2
        with:
          context: ./
          file: ./Dockerfile
          platforms: linux/amd64,linux/arm64/v8,linux/arm/v7
          push: true
          tags: ghcr.io/v-ashka/zadanie1_2022:latest
          #cache'owanie
          cache-from: type=gha
          cache-to: type=gha,mode=max
```
Różnice związane z cache'owaniem i jego brakiem, można zauważyć podczas buildowania, w commit'cie **update main.yml** wykorzystano cache'owanie, a czas ponowengo re-worku
akcji zmniejszył się prawie 2 krotnie
![image](https://user-images.githubusercontent.com/47278535/164993171-169dc920-43cd-4069-b82a-c10b5fcae60f.png)
Linijki z komentarzem CACHED, związane są właśnie z opcją uruchomienia cach'eowania pliku
![image](https://user-images.githubusercontent.com/47278535/164993215-afe7cdb2-5354-4e0c-9635-ad94ed59514e.png)

### <a name="dodatek2"></a> DODATEK 2
### 1. Wykorzystanie prywatnego rejestru na podstawie obrazu registry i uruchomienie go
a. uruchomienie rejestru aby był on dostępny na porcie 6677
```
docker run -d -p 6677:5000 --restart=always --name priv_reg registry
```
![image](https://user-images.githubusercontent.com/47278535/164993319-5c5b2b17-a9db-4e36-9b99-a56ae0538aae.png)

b. pobranie obrazu ubuntu, zmienienie jego nazwy i wgranie do utworzonego prywatnego rejestru
```
docker pull ubuntu
docker tag ubuntu:latest localhost:6677/priv-ubuntu
docker push localhost:6677/priv-ubuntu
```

Powyższe polecenia pobiorą i otagują najnowszy obraz ubuntu do rejestru, w celu sprawdzenia czy faktycznie doszło do wgrania do rejestru należy usunąć dane obrazy
```
docker image rm localhost:6677/priv-ubuntu
docker image rm ubuntu
```
Ostatnią rzeczą to pobranie ubuntu z utworzonego rejestru
```
docker pull localhost:6677/priv-ubuntu
```
Poniższy zrzut pokazuje że ubuntu zostało pomyślnie pobrane z prywatnego rejestru
![image](https://user-images.githubusercontent.com/47278535/164993476-2b5ee6c8-5b3b-494a-9a83-184ca1526b38.png)

### 2. Wdrożenie prywatnego rejestru z możliwością kontrolii dostępu poprzez mechanizm htpasswd

Z podanej w zadaniu dokumentacji, w celu wykorzystania systemu uwierzytelnienia należy skonfigurować warstwę TLS, co za tym idzie należy utworzyć i wygenerować
certyfikat SSL dla **localhost**

1. Przed wykonywaniem tych operacji należy utworzyć dwa foldery **auth** oraz **cert** w którym przechowywane będą certyfikaty oraz zaszyfrowany plik z nazwą logowanego usera

```
mkdir cert
mkdir auth
```
2. W folderze cert, należy wygenerować klucze prywatne
```
openssl req -x509 -nodes -new -sha256 -days 1024 -newkey rsa:2048 -keyout cert.key -out cert.pem
openssl x509 -outform pem -in cert.pem -out cert.crt
openssl req -new -nodes -newkey rsa:2048 -keyout localhost.key -out localhost.csr
```
3. Dodatkowo należy utworzyć plik **domains.ext**, który to przechowa informacje o domenie użytkownika
```
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names
[alt_names]
DNS.1 = localhost
```
4. Teraz możemy wygenerować pliki localhost.crt (przed wykonaniem tej operacji nalezy utworzyc plik domains.ext!)
```
openssl x509 -req -sha256 -days 1024 -in localhost.csr -CA cert.pem -CAkey cert.key -CAcreateserial -extfile domains.ext -out localhost.crt
```
5. W katalogu **auth** uruchamiamy mechanizm autentykacji pole admin to będzie login, polem hasło jest 1234, podane dane zostaną zapisane do pliku auth/httpasswd #htpasswd-auth
```
docker run --entrypoint htpasswd httpd:2 -Bbn admin 1234 > auth/htpasswd
```
6. Kolejnym krokiem jest wyłączenie i usunięcie rejestru który został utworzony i uruchomiony w [zadaniu dodatkowym 1](#zad1-dod)
```
docker container stop priv_reg
docker rm priv_reg
```
7. Dalej uruchamiamy nasz kontener ze specjalnymi zmiennymi, uruchamiającymi uwierzytelnianie
```
docker run -d \
   -p 6677:5000 \
   --restart=always \
   --name reg_priv \
   -v "$(pwd)"/auth:/auth \
   -e "REGISTRY_AUTH=htpasswd" \
   -e "REGISTRY_AUTH_HTPASSWD_REALM=Registry Realm" \
   -e REGISTRY_AUTH_HTPASSWD_PATH=/auth/htpasswd \
   -v "$(pwd)"/cert:/cert \
   -e REGISTRY_HTTP_TLS_CERTIFICATE=/cert/localhost.crt \
   -e REGISTRY_HTTP_TLS_KEY=/cert/localhost.key \
   registry
```
Po wykonaniu tych operacji, próbujemy zpushować nasz prywatny rejestr który był otagaowany nazwą **localhost:6677/priv-ubuntu**, jednak otrzymujemy konkrenty błąd
o wymaganej autoryzacji
![image](https://user-images.githubusercontent.com/47278535/164994322-bbc960e9-06e0-4462-92a4-b482019be0e9.png)
W takim razie logujemy się wpisując
```
docker login localhost:6677
```
I podajemy dane które zostały podane wtrakcie [uruchomnienia mechanizmu autentykacji](#htpasswd-auth), w tym przypadku login: admin, hasło: 1234
![image](https://user-images.githubusercontent.com/47278535/164994377-4e08d9c8-6882-4f98-8da8-5b4138f0a0c6.png)

Powyższy zrzut przedstawia efekt zalogowania się i późniejszą już możliwość wykonania operacji push na prywatny rejestr, a więc można uznać że konfiguracja prywatnego rejestru zakończyła się pomyślnie.

