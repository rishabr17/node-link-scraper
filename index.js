const cors = require('cors')({ origin: true });
const cheerio = require('cheerio');
const getUrls = require('get-urls');
const fetch = require('node-fetch');
const express = require('express');
const bodyParser = require('body-parser')

const app = express();

const port = process.env.PORT || 8080;

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      res.send(200);
    }
    else {
      next();
    }
};

app.use(allowCrossDomain);

app.get('/', function(req, res) {
    res.send('<h1>node-link-scraper</h1>')
});

app.listen(port, () => {
    console.log(`Server running at port `+port);
})

app.use(bodyParser.json({}))

const parseEnvList = (env) => {
    if (!env) {
      return [];
    }
    return env.split(',');
}

const whitelist = parseEnvList(process.env.WHITELIST);

const scrapeMetadata = (text) => {

    const urls = Array.from( getUrls(text) );
    const requests = urls.map(async url => {
        const res = await fetch(url);
        const html = await res.text();
        const $ = cheerio.load(html);
        let baseUrl = new URL(url)
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
            favicon = baseUrl.origin + favicon
        }
        var image = getMetatag('image');
        if(image != undefined && !validateUrl(image)){
            image = baseUrl.origin + image
        }

        return { 
            url,
            title: $('title').first().text(),
            favicon: favicon,
            // description: $('meta[name=description]').attr('content'),
            description: getMetatag('description'),
            image: image,
            author: getMetatag('author'),
        }
    });

    return Promise.all(requests);

}

exports.scraper = app.post('/', (request, response) => {
    var origin = request.headers.origin
    if (whitelist.length && whitelist.indexOf(origin) === -1) {
        response.writeHead(403, 'Forbidden');
        response.end('The origin "' + origin + '" was not whitelisted by the operator of this proxy.');
        return;
    }
    console.log(origin)
    cors(request, response, async () => {
        const data = await scrapeMetadata(request.body.text);

        response.send(data);
    })
});
