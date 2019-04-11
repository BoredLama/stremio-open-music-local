const openDirApi = require('./openDirectories.js')
const url = require('url')
const { proxy, config, cinemeta } = require('internal')


const toStream = (newObj, type) => {
    return {
        name: url.parse(newObj.href).host,
        type: type,
        url: newObj.href,
        // presume 128kbps if the filename has no extra tags
        title: newObj.extraTag || '128kbps'
    }
}

const { addonBuilder, getInterface, getRouter } = require('stremio-addon-sdk')

const builder = new addonBuilder({
	"id": "org.stremio.opendirmusic",
	"version": "1.0.0",

	"name": "Open Directories - Music",
	"description": "Stremio Add-on to get music streaming results from Open Directories",

	"icon": "https://secure.webtoolhub.com/static/resources/logos/set1/bc185e1e.jpg",

	"resources": [
	    "stream", "meta", "catalog"
	],

	"catalogs": [
	    {
	        id: "opendirmusic",
	        type: "tv",
	        extraSupported: ["search"],
	        extraRequired: ["search"]
	    }
	],

	"types": ["tv"],

	"idPrefixes": [ "openmusic:" ]

})

builder.defineCatalogHandler(args => {
    return Promise.resolve({
        metas: [
            {
                id: 'openmusic:'+encodeURIComponent(args.extra.search),
                name: args.extra.search,
                type: 'tv',
                poster: 'https://secure.webtoolhub.com/static/resources/logos/set1/bc185e1e.jpg',
                posterShape: 'landscape'
            }
        ]
    })

})

builder.defineMetaHandler(args => {
    return Promise.resolve({
        meta: {
            id: args.id,
            name: decodeURIComponent(args.id.replace('openmusic:','')),
            type: 'tv',
            poster: 'https://secure.webtoolhub.com/static/resources/logos/set1/bc185e1e.jpg',
            posterShape: 'landscape'
        }
    })

})

builder.defineStreamHandler(args => {
	return new Promise((resolve, reject) => {

	    let results = []

	    let sentResponse = false

	    const respondStreams = () => {

	        if (sentResponse) return
	        sentResponse = true

	        if (results && results.length) {

	            tempResults = results

	            const streams = []

	            tempResults.forEach(stream => { streams.push(toStream(stream, args.type)) })

	            if (streams.length) {
	                if (config.remote) {
	                    cb(null, { streams: streams })
	                } else {
	                    resolve({ streams: proxy.addAll(streams) })
	                }
	            } else {
	                resolve({ streams: [] })
	            }
	        } else {
	            resolve({ streams: [] })
	        }
	    }

	    const searchQuery = {
	        name: decodeURIComponent(args.id.replace('openmusic:', '')),
	        type: args.type
	    }

	    openDirApi.search(searchQuery,

	        partialResponse = (tempResults) => {
	            results = results.concat(tempResults)
	        },

	        endResponse = (tempResults) => {
	            results = tempResults
	            respondStreams()
	        })


	    if (config.responseTimeout)
	        setTimeout(respondStreams, config.responseTimeout)

	})
})

const addonInterface = getInterface(builder)

module.exports = getRouter(addonInterface)
