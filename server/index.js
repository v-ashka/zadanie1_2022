const express = require('express')
const app = express()
const fs = require('fs');
const https = require('https')
const http = require('http')
app.use(express.json())
const PORT = process.env.PORT || 3000
const accDate = require('./server-files/getDate');
const newline = '\n';
const serverRunInfo = `|${accDate()}|| Marcin Wijaszka | Serwer został uruchomiony na porcie ${PORT}`
// serverlog file
const path = './serverlogs.txt'


const url = 'https://myexternalip.com/json'

app.use(async function (request, response, next) {
    // res.json(await getAddressDetails());
    return https.get(url, res => {
        let data = '';      
        res.on('data', chunk => {
          data += chunk;
        });
        res.on('end', () => {
          data = JSON.parse(data);
          //console.log(data);
          const ip = data.ip;
        
           http.get(`http://ip-api.com/json/${ip}`, res => {
            let geoData = '';      
            res.on('data', chunk => {
              geoData += chunk;
            });
            res.on('end', () => {
              geoData = JSON.parse(geoData);
                
            //   console.log(`geodata: ${geoData.country}`);
            let options = {
                timeZone: `${geoData.timezone}`,
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
              },
              formatter = new Intl.DateTimeFormat([], options);

              userRegionInfo = `|${accDate()}| ${ request.method } | Adres IP klienta: ${ip} | lokalizacja: ${geoData.country} | lokalny czas klienta: ${formatter.format(new Date())}`;
              
            // console.log();
              fs.appendFile(path, userRegionInfo+newline, (err) => {
                  // throws an error, you could also catch it here
                  if (err) throw err;
          
                  // success case, the file was saved
                  console.log(userRegionInfo);
              });
              response.send(`${userRegionInfo}`);
            })
          }).on('error', err => {
            console.log(`Can't get geolocation! ${err.message}`);
          })

        })
      }).on('error', err => {
        console.log(`Can't get IP address: ${err.message}`);
      })
  next()
})


app.listen(PORT, () => console.log(serverRunInfo));


fs.appendFile(path, serverRunInfo+newline, (err) => {
    // throws an error, you could also catch it here
    if (err) throw err;

    // success case, the file was saved
});
