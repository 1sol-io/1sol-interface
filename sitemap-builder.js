require('babel-register')

const { createWriteStream } = require('fs')
const axios = require('axios')
const splTokenRegistry = require('@solana/spl-token-registry')
const { SitemapStream } = require('sitemap')

const hostname = 'http://app.1sol.io'

const queryJsonFiles = async (files) => {
  const responses = await Promise.all(
    files.map(async (repo) => {
      try {
        const { data } = await axios.get(repo)

        return data
      } catch (e) {
        console.error(e)

        return []
      }
    })
  )

  return responses
    .map((tokenlist) => tokenlist.tokens)
    .reduce((acc, arr) => acc.concat(arr), [])
}

const fetchTokenList = async () => {
  const customTokenJSON = await queryJsonFiles([
    'https://cdn.jsdelivr.net/gh/1sol-io/token-list@main/src/tokens/solana.tokenlist.json'
  ])
  const customTokenList = new splTokenRegistry.TokenListContainer(
    customTokenJSON
  )

  const customList = customTokenList
    .filterByChainId(101)
    .excludeByTag('nft')
    .getList()

  const knownMints = customList.reduce((map, item) => {
    map.set(item.address, item)
    return map
  }, new Map())

  return [...knownMints.values()].map(({ symbol }) => symbol)
}

const build = async () => {
  const tokens = await fetchTokenList()

  const pairs = tokens.map((tokenA) =>
    tokens.map((tokenB) => [
      `${hostname}/trade/${tokenA}-${tokenB}`,
      `${hostname}/trade/${tokenB}-${tokenA}`
    ])
  )

  const params = [...new Set(pairs.flat(2))]
  const paths = [`${hostname}/`, `${hostname}/dashboard`, ...params]

  const sitemap = new SitemapStream({ hostname })

  const writeStream = createWriteStream('./public/sitemap.xml')

  sitemap.pipe(writeStream)

  paths.forEach((path) => {
    sitemap.write(path)
  })

  sitemap.end()
}

build()
