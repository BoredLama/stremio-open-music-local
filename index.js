const modules = require('./modules')
const openDirApi = require('./openDirectories.js')

const toStream = (newObj, type) => {
    return {
        name: modules.get.url.parse(newObj.href).host,
        type: type,
        url: newObj.href,
        // presume 128kbps if the filename has no extra tags
        title: newObj.extraTag || '128kbps'
    }
}

module.exports = {
	manifest: () => {
		return {
			"id": "org.stremio.opendirmusic",
			"version": "1.0.0",

			"name": "Stremio Open Music Addon",
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

		}
	},
	handler: (args, local) => {
		modules.set(local.modules)
		const config = local.config
		const proxy = modules.get.internal.proxy
		const cinemeta = modules.get.internal.cinemeta
		return new Promise((resolve, reject) => {

		    if (!args.id) {
		        reject(new Error('No ID Specified'))
		        return
		    }

		    if (args.resource == 'catalog') {
		    	console.log(args)
		        resolve({
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
		    } else if (args.resource == 'meta') {
		        resolve({
		            meta: {
		                id: args.id,
		                name: decodeURIComponent(args.id.replace('openmusic:','')),
		                type: 'tv',
		                poster: 'https://secure.webtoolhub.com/static/resources/logos/set1/bc185e1e.jpg',
		                posterShape: 'landscape'
		            }
		        })
		    } else if (args.resource == 'stream') {

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

			    openDirApi.search(config, searchQuery,

			        partialResponse = (tempResults) => {
			            results = results.concat(tempResults)
			        },

			        endResponse = (tempResults) => {
			            results = tempResults
			            respondStreams()
			        })


			    if (config.responseTimeout)
			        setTimeout(respondStreams, config.responseTimeout)
			}
		})
	}
}
