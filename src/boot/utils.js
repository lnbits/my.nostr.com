import axios from 'axios'
import {Converter} from 'showdown'

function secondsToDhm(seconds) {
  seconds = Number(seconds)
  const d = Math.floor(seconds / (3600 * 24))
  const h = Math.floor((seconds % (3600 * 24)) / 3600)
  const m = Math.floor((seconds % 3600) / 60)

  const dDisplay = d > 0 ? d + (d == 1 ? ' day, ' : ' days, ') : ''
  const hDisplay = h > 0 ? h + 'h, ' : ''
  const mDisplay = m > 0 ? m + 'm' : ''

  const text = dDisplay + hDisplay + mDisplay
  return text || '0'
}

function timeFromNow(time) {
  // Get timestamps
  let unixTime = new Date(time).getTime()
  if (!unixTime) return
  let now = new Date().getTime()

  // Calculate difference
  let difference = unixTime / 1000 - now / 1000

  // Setup return object
  let tfn = {}

  // Check if time is in the past, present, or future
  tfn.when = 'now'
  if (difference > 0) {
    tfn.when = 'future'
  } else if (difference < -1) {
    tfn.when = 'past'
  }

  // Convert difference to absolute
  difference = Math.abs(difference)

  // Calculate time unit
  if (difference / (60 * 60 * 24 * 365) > 1) {
    // Years
    tfn.unitOfTime = 'years'
    tfn.time = Math.floor(difference / (60 * 60 * 24 * 365))
  } else if (difference / (60 * 60 * 24 * 45) > 1) {
    // Months
    tfn.unitOfTime = 'months'
    tfn.time = Math.floor(difference / (60 * 60 * 24 * 45))
  } else if (difference / (60 * 60 * 24) > 1) {
    // Days
    tfn.unitOfTime = 'days'
    tfn.time = Math.floor(difference / (60 * 60 * 24))
  } else if (difference / (60 * 60) > 1) {
    // Hours
    tfn.unitOfTime = 'hours'
    tfn.time = Math.floor(difference / (60 * 60))
  } else if (difference / 60 > 1) {
    // Minutes
    tfn.unitOfTime = 'minutes'
    tfn.time = Math.floor(difference / 60)
  } else {
    // Seconds
    tfn.unitOfTime = 'seconds'
    tfn.time = Math.floor(difference)
  }

  // Return time from now data
  if (tfn.when === 'now') {
    return 'just now'
  } else if (tfn.when === 'future') {
    return `${tfn.time} ${tfn.unitOfTime}`
  } else {
    return `${tfn.time} ${tfn.unitOfTime} ago`
  }
}

function timeFromSeconds(seconds) {
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)} minutes`
  }
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)} hours`
  }
  const d = Math.floor(seconds / 86400)
  return `${d} day${d > 1 ? 's' : ''}`
}

let tags = [
  ['r', 'wss://relay.damus.io'],
  ['r', 'wss://nostr-pub.wellorder.net'],
  ['client', 'coracle']
]

function getTagValues(event, tag) {
  return event.tags.filter(([k, v]) => k == tag).map(([k, v]) => v)
}

function getTagValue(event, tag) {
  return event.tags.find(([k, v]) => k == tag)?.[1]
}

async function markdownToHTML(url) {
  const response = await axios({
    method: 'GET',
    withCredentials: false,
    url
  })

  const converter = new Converter()
  converter.setFlavor('github')
  converter.setOption('simpleLineBreaks', true)
  return converter.makeHtml(response.data)
}

function countDownTimer(target) {
  const timeNow = new Date().getTime()
  const timeDifference = target - timeNow
  if (timeDifference < 0) {
    return {days: 0, hours: 0, minutes: 0, seconds: 0}
  }
  // Time calculations for days, hours, minutes and seconds
  const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24))
  const hours = Math.floor(
    (timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  )
  const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000)

  return {days, hours, minutes, seconds}
}

function prepareFilterQuery(tableConfig, props) {
  tableConfig.filter = tableConfig.filter || {}
  if (props) {
    tableConfig.pagination = props.pagination
    Object.assign(tableConfig.filter, props.filter)
  }
  const pagination = tableConfig.pagination
  tableConfig.loading = true
  const query = {
    limit: pagination.rowsPerPage,
    offset: (pagination.page - 1) * pagination.rowsPerPage,
    sortby: pagination.sortBy ?? '',
    direction: pagination.descending ? 'desc' : 'asc',
    ...tableConfig.filter
  }
  if (tableConfig.search) {
    query.search = tableConfig.search
  }
  return new URLSearchParams(query)
}

function formatCurrency(value, currency) {
  if (currency === 'sat' || currency === 'sats') {
    return `${value.toLocaleString(window.LOCALE, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })} sats`
  }
  if (!currency) {
    return Number(value || 0).toLocaleString(window.LOCALE)
  }
  return new Intl.NumberFormat(window.LOCALE, {
    style: 'currency',
    currency
  }).format(value)
}

function firstDefined(...values) {
  return values.find(value => value !== undefined && value !== null)
}

function getCheckoutUrl(data = {}) {
  return firstDefined(
    data.checkout_url,
    data.checkoutUrl,
    data.checkout_page,
    data.checkout_page_url,
    data.checkout_session_url,
    data.payment_url,
    data.payment_request_url,
    isValidUrl(data.payment_request) ? data.payment_request : null
  )
}

function getFiatPriceText(data = {}) {
  const extra = data.extra || {}
  const price = firstDefined(
    data.fiat_price,
    data.fiat_amount,
    data.amount_fiat,
    data.price_fiat,
    extra.fiat_price,
    extra.fiat_amount,
    extra.amount_fiat,
    extra.price_fiat
  )
  const currency = firstDefined(
    data.fiat_currency,
    data.currency_fiat,
    extra.fiat_currency,
    extra.currency_fiat
  )

  if (price !== undefined && price !== null) {
    return formatCurrency(Number(price), currency || 'USD')
  }

  const itemPrice = firstDefined(data.price, data.amount, extra.price)
  const itemCurrency = firstDefined(data.currency, extra.currency)
  if (itemPrice !== undefined && itemCurrency && !isSatsCurrency(itemCurrency)) {
    return formatCurrency(Number(itemPrice), itemCurrency)
  }

  return ''
}

function isSatsCurrency(currency) {
  return ['sat', 'sats', 'btc', 'bitcoin'].includes(
    `${currency}`.toLowerCase()
  )
}

function isValidUrl(value) {
  if (!value || typeof value !== 'string') {
    return false
  }
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

export {
  secondsToDhm,
  timeFromNow,
  timeFromSeconds,
  getTagValues,
  markdownToHTML,
  countDownTimer,
  prepareFilterQuery,
  formatCurrency,
  getCheckoutUrl,
  getFiatPriceText
}
