import {SimplePool} from 'nostr-tools/pool'
import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  verifyEvent
} from 'nostr-tools/pure'
import {decode as decodeNip19} from 'nostr-tools/nip19'
import {
  decrypt as nip04Decrypt,
  encrypt as nip04Encrypt
} from 'nostr-tools/nip04'
import {
  decrypt as nip44Decrypt,
  encrypt as nip44Encrypt,
  getConversationKey
} from 'nostr-tools/nip44'

const NIP46_KIND = 24133
const DEFAULT_PERMISSIONS = 'sign_event'
const DEFAULT_REQUEST_TIMEOUT_MS = 120000
const HEX_64 = /^[0-9a-f]{64}$/i

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(value => value.toString(16).padStart(2, '0'))
    .join('')
}

function randomId() {
  const crypto = globalThis.crypto
  if (crypto?.getRandomValues) {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    return bytesToHex(bytes)
  }
  return Math.random().toString(36).slice(2)
}

function normalizePubkey(value) {
  const trimmed = value?.trim()
  if (!trimmed) {
    return null
  }
  if (HEX_64.test(trimmed)) {
    return trimmed.toLowerCase()
  }
  try {
    const decoded = decodeNip19(trimmed)
    if (decoded.type === 'npub' && HEX_64.test(decoded.data)) {
      return decoded.data.toLowerCase()
    }
  } catch {}
  return null
}

export function normalizeNip46RelayUrl(value) {
  const trimmed = value?.trim()
  if (!trimmed) {
    return null
  }
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
      return null
    }
    if (!url.hostname) {
      return null
    }
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

export function normalizeNip46BunkerInput(value) {
  const trimmed = value?.trim()
  if (!trimmed) {
    return null
  }
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'bunker:') {
      return null
    }
    const signerPubkey = normalizePubkey(
      url.hostname || url.pathname.replace(/^\/+/, '')
    )
    if (!signerPubkey) {
      return null
    }
    const relayUrls = Array.from(
      new Set(
        url.searchParams
          .getAll('relay')
          .map(normalizeNip46RelayUrl)
          .filter(Boolean)
      )
    )
    if (relayUrls.length === 0) {
      return null
    }
    const userPubkeyParam = url.searchParams.get('pubkey')
    const userPubkey = userPubkeyParam ? normalizePubkey(userPubkeyParam) : null
    if (userPubkeyParam && !userPubkey) {
      return null
    }
    return {
      signerPubkey,
      userPubkey,
      relayUrls,
      secret: url.searchParams.get('secret') || ''
    }
  } catch {
    return null
  }
}

export function buildNostrConnectUri({
  clientPubkey,
  relayUrl,
  secret,
  name = 'myNostr',
  permissions = DEFAULT_PERMISSIONS,
  url
}) {
  const normalizedClientPubkey = normalizePubkey(clientPubkey)
  const normalizedRelayUrl = normalizeNip46RelayUrl(relayUrl)
  if (!normalizedClientPubkey) {
    throw new Error('A valid NIP-46 client public key is required.')
  }
  if (!normalizedRelayUrl) {
    throw new Error('Enter a valid ws:// or wss:// relay URL.')
  }
  if (!secret?.trim()) {
    throw new Error('A NIP-46 connection secret is required.')
  }
  const params = new URLSearchParams()
  params.set('relay', normalizedRelayUrl)
  params.set('secret', secret.trim())
  params.set('perms', permissions)
  params.set('name', name)
  const appUrl =
    url?.trim() ||
    (typeof window === 'undefined' ? '' : window.location.origin)
  if (appUrl) {
    params.set('url', appUrl)
  }
  return `nostrconnect://${normalizedClientPubkey}?${params.toString()}`
}

class Nip46RemoteSignerSession {
  constructor({
    clientSecretKey = generateSecretKey(),
    relayUrls,
    signerPubkey = null,
    userPubkey = null,
    onAuthUrl
  }) {
    this.clientSecretKey = clientSecretKey
    this.clientPubkey = getPublicKey(clientSecretKey)
    this.relayUrls = relayUrls
    this.signerPubkey = signerPubkey
    this.userPubkey = userPubkey
    this.onAuthUrl = onAuthUrl
    this.pool = new SimplePool()
    this.requestHandlers = new Map()
    this.responseHandlers = new Set()
    this.closeRejecters = new Set()
    this.subCloser = null
    this.closed = false
    this.encryptionType = 'nip44'
    this.startListening()
  }

  startListening() {
    if (this.subCloser) {
      return
    }
    this.subCloser = this.pool.subscribeMany(
      this.relayUrls,
      [{kinds: [NIP46_KIND], '#p': [this.clientPubkey]}],
      {
        onevent: event => {
          this.handleEvent(event)
        }
      }
    )
  }

  close() {
    this.closed = true
    this.subCloser?.close()
    this.subCloser = null
    this.pool.close(this.relayUrls)
    for (const handler of this.requestHandlers.values()) {
      window.clearTimeout(handler.timeoutId)
      handler.reject(new Error('NIP-46 login was cancelled.'))
    }
    for (const rejecter of this.closeRejecters) {
      rejecter()
    }
    this.requestHandlers.clear()
    this.responseHandlers.clear()
    this.closeRejecters.clear()
  }

  decryptEvent(event) {
    const tryNip44 = () =>
      nip44Decrypt(
        event.content,
        getConversationKey(this.clientSecretKey, event.pubkey)
      )
    const tryNip04 = () =>
      nip04Decrypt(this.clientSecretKey, event.pubkey, event.content)

    if (this.encryptionType === 'nip44') {
      try {
        return tryNip44()
      } catch {
        this.encryptionType = 'nip04'
        return tryNip04()
      }
    }

    try {
      return tryNip04()
    } catch {
      this.encryptionType = 'nip44'
      return tryNip44()
    }
  }

  async encryptRequest(remotePubkey, content) {
    if (this.encryptionType === 'nip04') {
      return nip04Encrypt(this.clientSecretKey, remotePubkey, content)
    }
    return nip44Encrypt(
      content,
      getConversationKey(this.clientSecretKey, remotePubkey)
    )
  }

  async handleEvent(event) {
    if (this.closed) {
      return
    }
    let response
    try {
      response = JSON.parse(await this.decryptEvent(event))
    } catch (error) {
      console.warn('Failed to parse NIP-46 response.', error)
      return
    }

    const normalizedResponse = {...response, event}
    if (response.result === 'auth_url') {
      const url = response.error?.trim()
      if (url) {
        this.onAuthUrl?.(url)
      }
      return
    }

    for (const handler of this.responseHandlers) {
      handler(normalizedResponse)
    }

    const id = response.id
    const requestHandler = id ? this.requestHandlers.get(id) : null
    if (!requestHandler) {
      return
    }
    window.clearTimeout(requestHandler.timeoutId)
    this.requestHandlers.delete(id)
    if (response.error) {
      requestHandler.reject(new Error(response.error))
      return
    }
    requestHandler.resolve(normalizedResponse)
  }

  async sendRequest(method, params = [], timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
    if (!this.signerPubkey) {
      throw new Error('Remote signer public key is not available.')
    }
    if (this.closed) {
      throw new Error('Remote signer session is closed.')
    }

    const id = randomId()
    const content = JSON.stringify({id, method, params})
    const encryptedContent = await this.encryptRequest(this.signerPubkey, content)
    const event = finalizeEvent(
      {
        kind: NIP46_KIND,
        tags: [['p', this.signerPubkey]],
        content: encryptedContent,
        created_at: Math.floor(Date.now() / 1000)
      },
      this.clientSecretKey
    )

    const response = new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        this.requestHandlers.delete(id)
        reject(new Error(`NIP-46 ${method} request timed out.`))
      }, timeoutMs)
      this.requestHandlers.set(id, {resolve, reject, timeoutId})
    })

    try {
      await this.publishEvent(event)
    } catch (error) {
      const handler = this.requestHandlers.get(id)
      if (handler) {
        window.clearTimeout(handler.timeoutId)
        this.requestHandlers.delete(id)
        handler.reject(error)
      }
    }

    return response
  }

  publishEvent(event) {
    const publishPromises = this.pool.publish(this.relayUrls, event)
    if (publishPromises.length === 0) {
      return Promise.reject(new Error('No NIP-46 relays are available.'))
    }

    return new Promise((resolve, reject) => {
      let pending = publishPromises.length
      const errors = []
      for (const publishPromise of publishPromises) {
        publishPromise
          .then(resolve)
          .catch(error => {
            errors.push(error)
            pending -= 1
            if (pending === 0) {
              reject(errors[0] || new Error('Failed to publish NIP-46 request.'))
            }
          })
      }
    })
  }

  async connect(secret = '') {
    const params = [this.userPubkey || '']
    if (secret) {
      params.push(secret)
    }
    const response = await this.sendRequest('connect', params)
    if (response.result !== 'ack') {
      throw new Error(response.result || 'Remote signer did not acknowledge the connection.')
    }
    await this.getPublicKey()
    return this
  }

  async getPublicKey() {
    const response = await this.sendRequest('get_public_key', [])
    const pubkey = normalizePubkey(response.result)
    if (!pubkey) {
      throw new Error('The remote signer did not return a valid user public key.')
    }
    this.userPubkey = pubkey
    return pubkey
  }

  async signEvent(event) {
    const response = await this.sendRequest('sign_event', [JSON.stringify(event)])
    let signedEvent
    try {
      signedEvent = JSON.parse(response.result)
    } catch {
      throw new Error('Remote signer returned an invalid signed event.')
    }
    if (!verifyEvent(signedEvent)) {
      throw new Error('Remote signer returned an event with an invalid signature.')
    }
    return signedEvent
  }

  waitForNostrConnect(secret) {
    return new Promise((resolve, reject) => {
      const rejectCancelled = () => {
        this.responseHandlers.delete(handler)
        reject(new Error('NIP-46 login was cancelled.'))
      }
      const handler = response => {
        if (response.result !== secret) {
          return
        }
        this.responseHandlers.delete(handler)
        this.closeRejecters.delete(rejectCancelled)
        this.signerPubkey = normalizePubkey(response.event.pubkey)
        if (!this.signerPubkey) {
          reject(new Error('Remote signer returned an invalid signer public key.'))
          return
        }
        this.getPublicKey().then(() => resolve(this)).catch(reject)
      }
      this.responseHandlers.add(handler)
      this.closeRejecters.add(rejectCancelled)
    })
  }
}

export async function connectNip46Bunker({connectionToken, onAuthUrl}) {
  const bunker = normalizeNip46BunkerInput(connectionToken)
  if (!bunker) {
    throw new Error('Enter a valid bunker:// connection string with at least one relay.')
  }

  const session = new Nip46RemoteSignerSession({
    signerPubkey: bunker.signerPubkey,
    userPubkey: bunker.userPubkey,
    relayUrls: bunker.relayUrls,
    onAuthUrl
  })

  try {
    return await session.connect(bunker.secret)
  } catch (error) {
    session.close()
    throw error
  }
}

export function createNostrConnectLogin({relayUrl, onAuthUrl}) {
  const normalizedRelayUrl = normalizeNip46RelayUrl(relayUrl)
  if (!normalizedRelayUrl) {
    throw new Error('Enter a valid ws:// or wss:// relay URL.')
  }

  const secret = randomId()
  const session = new Nip46RemoteSignerSession({
    relayUrls: [normalizedRelayUrl],
    onAuthUrl
  })
  const uri = buildNostrConnectUri({
    clientPubkey: session.clientPubkey,
    relayUrl: normalizedRelayUrl,
    secret
  })

  return {
    uri,
    relayUrl: normalizedRelayUrl,
    login: session.waitForNostrConnect(secret),
    cancel: () => session.close()
  }
}
