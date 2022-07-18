const express = require("express")
const app = express()
const unirest = require("unirest")
const port = 3000
const https = require("https")
const openWeatherId = "48a1ea8e242677980dce067e25c274ef"
const bodyParser = require("body-parser")

app.use(bodyParser.urlencoded({extended: true}))

function getCoordinates(city, units) {
    const geocodingUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${city}&appid=${openWeatherId}`
    return new Promise((resolve, reject) => {
            https.get(geocodingUrl, function (response) {
                    let a, b
                    response.on("data", (data) => {
                        const locationData = JSON.parse(data)
                        if (locationData.length === 0) {
                            reject(new Error(`Ooops. ${city} not Found`))
                        } else {
                            a = locationData[0].lat
                            b = locationData[0].lon
                            resolve([a, b, units])
                        }
                    })
                }
            )
        }
    )
}

app.get("/", function (req, res) {
    res.sendFile(__dirname + "/index.html")
})

function getWeatherUrl(latitude, longitude, un) {
    return `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${openWeatherId}&units=${un}`
}

app.post("/", function (req, res) {
    let city, units
    city = req.body.cityName
    units = req.body.units
    if (city) {
        getCoordinates(city, units).then(response => {
            const lat = response[0]
            const lon = response[1]
            const userUnits = response[2]
            const currentWeatherUrl = getWeatherUrl(lat, lon, userUnits)
            renderWeatherPage(currentWeatherUrl, userUnits).then(function (result) {
                res.send(result)
            })
        }).catch(error => {
            res.status(404).send(`<h1>${error.message}</h1>`)
        })
    } else {
        res.sendFile(__dirname + "/index.html")

    }
})

app.post("/current-location", function (req, res) {
    let units = req.body.units
    let apiCall = unirest(
        "GET",
        "http://ipwho.is/", {
            "X-RapidAPI-Key": "296def74e0mshc1a17c1a4aef745p1cea02jsnb1cd0bdf3a9c",
            "X-RapidAPI-Host": "ip-geolocation-ipwhois-io.p.rapidapi.com",
            "useQueryString": true
        })
    apiCall.end(function (result) {
        if (res.error) throw new Error(result.error)
        const lat = result.body.latitude
        const lon = result.body.longitude
        const currentWeatherUrl = getWeatherUrl(lat, lon, units)
        renderWeatherPage(currentWeatherUrl, units).then(function (result) {
            res.send(result)
        })
    })

})

app.listen(port, function () {
    console.log("Server running on 3000")
})


function renderWeatherPage(weatherUrl, userUnits) {
    return new Promise((resolve) => {
            https.get(weatherUrl, function (response) {
                response.on("data", function (data) {
                    const weatherData = JSON.parse(data)
                    const imageIconUrl = `http://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`
                    const temp = weatherData.main.temp
                    const weatherDescription = weatherData.weather[0].description
                    const location = `${weatherData.name}, ${weatherData.sys.country}`
                    let tempSymbol
                    switch (userUnits) {
                        case "metric":
                            tempSymbol = "°C"
                            break
                        case "imperial":
                            tempSymbol = "°F"
                            break
                        default:
                            tempSymbol = "K"
                            break
                    }
                    resolve(`<p>The weather in ${location} is currently ${weatherDescription}</p><br><h1>The temperature is ${temp}${tempSymbol}</h1><br><img src="${imageIconUrl}">`)
                })

            })
        }
    )

}
