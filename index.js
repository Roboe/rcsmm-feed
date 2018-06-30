const requestp = require('request-promise-native')
const { JSDOM } = require('jsdom')
const Feed = require('feed')
const fs = require('fs')


/* Constants */
const SITE_URL = 'https://rcsmm.eu'

// Unfortunatelly there's no date info for entries in this shitty website, *facepalm*
// I'll fake one because Atom entries must include a date of update
const FAKE_DATE = new Date()

const FEED_OUTPUTFILE = 'atom.xml'
const FEED_URL = `https://Roboe.gitlab.io/rcsmm-feed/${ FEED_OUTPUTFILE }`
const FEED_AUTHOR = {
  name: 'Roberto MF (Roboe)',
  email: 'rcsmm-feed@virgulilla.com',
  link: 'https://gitlab.com/Roboe/rcsmm-feed'
}
const FEED_METADATA = {
  title: 'Secretaría RCSMM',
  description: 'Feed no oficial de las novedades de la secretaría del RCSMM',
  id: SITE_URL,
  link: SITE_URL,
  image: `${ SITE_URL }/general/images/logos/logo_ext_300.png`,
//  favicon: 'http://example.com/favicon.ico',
//  copyright: 'All rights reserved 2013, John Doe',
  updated: FAKE_DATE, // optional, default = today
//  generator: 'awesome', // optional, default = 'Feed for Node.js'
  feedLinks: {
//    json: 'https://example.com/json',
    atom: FEED_URL,
  },
  author: FEED_AUTHOR,
}


/* Functions */
const htmlToJsdom = (html) => new JSDOM(html)

const findUpdates = ({ window: { document } }) =>
  [...document
    .querySelectorAll('.accordion-box .accord-elem')
  ]

const getTitleFrom = (updateElement) => updateElement
  .querySelector('.accord-title')
  .textContent
  .trim()

const getTextContentFrom = (updateElement) =>
  [...updateElement.querySelectorAll('.accord-content p')]
  .map(({ textContent }) => `<p>${ textContent.trim() }</p>`)
  .join('\n')

const getIdFrom = (updateElement) => updateElement
  .querySelector('.accord-content a.main-button')
  .attributes['target']
  .value // absurd ID in the form `file_${ sha1sum(documentNumber)` }

const getLinkFrom = (updateElement) => {
  const value = updateElement
    .querySelector('.accord-content a.main-button')
    .getAttribute('href')

  return (value.startsWith('/'))
    ? `${SITE_URL}${value}`
    : value
}

const addFeedEntryTo = (feed) => (post) => {
  const contentWithLink = `${ post.content }
<p><a href="${ post.documentUrl }">Descargar fichero</a></p>`

  feed.addItem({
    title: post.title,
    id: post.documentUrl,
    link: post.documentUrl,
//    description: post.description,
    content: contentWithLink,
//    author: [FEED_AUTHOR],
    date: FAKE_DATE,
//    image: post.image,
  })
}

/* Main */
const abstractFeed = requestp(SITE_URL)
  .then(htmlToJsdom)
  .then(findUpdates)
  .then((allUpdates) => allUpdates
    .map((update) => ({
      title: getTitleFrom(update),
      documentUrl: getLinkFrom(update),
      content: getTextContentFrom(update),
    }))
  )
//  .then(console.log.bind(console))
  .catch((error) => {
    console.error(error)
  })
  .then((updates) => {
    const feed = new Feed(FEED_METADATA)

    updates.forEach(addFeedEntryTo(feed))
    return feed
  })
  .then((feed) => {
    fs.writeFileSync(
      FEED_OUTPUTFILE,
      feed.atom1(),
    )
  })
