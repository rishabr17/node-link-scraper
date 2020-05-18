const cors = require('cors')({ origin: true });
const cheerio = require('cheerio');
const getUrls = require('get-urls');
const fetch = require('node-fetch');
const express = require('express');
const bodyParser = require('body-parser')

const app = express();

const port = 8080;

app.listen(port, () => {

})

app.use(bodyParser.json({}))

const scrapeMetadata = (text) => {

    const urls = Array.from( getUrls(text) );
    const requests = urls.map(async url => {
        const res = await fetch(url);
        console.log(url)
        const html = await res.text();
        const $ = cheerio.load(html);
        
        const getMetatag = (name) =>  
            $(`meta[name="${name}"]`).attr('content') ||  
            $(`meta[property="og:${name}"]`).attr('content') ||  
            $(`meta[property="twitter:${name}"]`).attr('content');
        
        const getFavicon = () =>
            $('link[rel="shortcut icon"]').attr('href') ||
            $('link[rel="icon"]').attr('href') ||
            $('link[rel="favicon"]').attr('href');

        const validateUrl = (value) => {
            return /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(value);
        }

        var favicon = getFavicon();
        if(favicon != undefined && !validateUrl(favicon)){
            favicon = url + favicon
        }

        return { 
            url,
            title: $('title').first().text(),
            favicon: favicon,
            // description: $('meta[name=description]').attr('content'),
            description: getMetatag('description'),
            image: getMetatag('image'),
            author: getMetatag('author'),
        }
    });

    return Promise.all(requests);

}

exports.scraper = app.post('/', (request, response) => {
    console.log(request.body)
    cors(request, response, async () => {
        const data = await scrapeMetadata(request.body.text);

        response.send(data);
    })
});