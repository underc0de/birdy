import { sign } from '../../lib/signer'
import { readFileSync, writeFile, statSync } from 'fs'
import path from 'path'

import { minify } from 'uglify-js'
import csswring from 'csswring'

class ProviderService {

  constructor() {
    this.version = 1
    this.fileMaxCacheAge = 31536e3
    this.cacheFilePath = path.join(__dirname, '..', '..', '.cache')

    this.setupRequireHooks()

    if (!process.env.RESET_CACHE) {
      this._data = this.loadCacheSync(this.cacheFilePath)
    } else {
      this._data = Object.create(null)
    }
  }

  /*
  provide(source, type) {
    let fileURI = `${this._uri}/${this._uid}.${type}`

    global.router.link(fileURI, (req, res) => {
      if (type === 'css') {
        req.accepts(type)
        res.header('Content-Type', 'text/css')
      }

      res.header('Cache-Control', `public, max-age=${this.fileMaxCacheAge}`)
      res.end(sign(source))//serve signed content
    })

    return fileURI
  }*/

  provideSource(filepath) {
    filepath = path.normalize(filepath)

    let record = this._has(filepath, 'data') ? this._data[filepath] : this._cache(filepath)

    global.router.link(record.meta.uri, (req, res) => {
      console.log(`Serving ${record.meta.uri}`)

      if (record.meta.type === '.css') {
        req.accepts('css')
        res.header('Content-Type', 'text/css')
      }
      res.header('Cache-Control', `public, max-age=${this.fileMaxCacheAge}`)

      res.end(record.data)//serve signed content
    })

    return record.meta.uri
  }

  loadCacheSync(cacheFilePath) {
    console.log(`Loading cache file ${this.cacheFilePath}...`)

    this._data = Object.create(null)

    try {
      this._data = JSON.parse(readFileSync(cacheFilePath))
    } catch(err) { }

    return this._data
  }

  setupRequireHooks() {
    // CSS Modules
    require('css-modules-require-hook')({
      prepend: [
        // CSS Minification plugin
        csswring(),
      ],
      generateScopedName: process.env.CSS_SCOPE_NAME || '_[hash:base64:5]',
      processCss: (css, filepath) => {
        this._cache(filepath, css, true)
      }
    })
  }

  _cache(filepath, content=null, isRelative=false) {
    let fileEXT = path.extname(filepath)
    let fileURI = `${this._uri}/${this._uid}${fileEXT}`

    if (isRelative) {
      filepath = path.relative( path.join(__dirname, '..', 'resources'), filepath )
    } else {
      filepath = path.normalize(filepath)
    }

    let record = Object.create(null)
    this._data[filepath] = record
    this._data[filepath].meta = Object.create(null)
    this._data[filepath].meta.uri = fileURI
    this._data[filepath].meta.type = fileEXT

    if (content === null) {
      content = readFileSync( path.join(__dirname, '..', 'resources', filepath), 'utf8' )
    }

    if (fileEXT === '.js') {
      this._data[filepath].data = sign(minify(content, { fromString: true }).code)
    } else {
      this._data[filepath].data = sign(content)
    }

    this._persistCache()

    return record
  }

  _has(filepath, field) {
    return Object.prototype.hasOwnProperty.call(this._data, filepath) &&
      (!field || Object.prototype.hasOwnProperty.call(this._data[filepath], field))
  }

  _persistCache() {
    writeFile(this.cacheFilePath, JSON.stringify(this._data))
  }

  get _uri() {
    return `${process.env.ASSETS_URI}/v${this.version}`
  }

  get _uid() {
    var S4 = function() {
      return (Math.floor(((1+Math.random())*0x10000))).toString(16).substring(1)
    }

    return S4() + S4() + '-' +  S4()
  }
  
}

export default ProviderService