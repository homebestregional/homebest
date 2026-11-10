import 'server-only'

// Pesapal API 3.0 (JSON).
// Docs: https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/api-reference

const BASE_URLS = {
  sandbox: 'https://cybqa.pesapal.com/pesapalv3/api',
  live: 'https://pay.pesapal.com/v3/api',
}

export function pesapalEnv() {
  return process.env.PESAPAL_ENV === 'live' ? 'live' : 'sandbox'
}

function baseUrl() {
  return BASE_URLS[pesapalEnv()]
}

export function isPesapalConfigured() {
  return Boolean(process.env.PESAPAL_CONSUMER_KEY && process.env.PESAPAL_CONSUMER_SECRET)
}

async function call(path, { method = 'GET', token, body, allowError = false } = {}) {
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' }
  if (token) headers.Authorization = 'Bearer ' + token
  const res = await fetch(baseUrl() + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('Pesapal returned an unexpected reply (' + res.status + ')')
  }
  const isStatusReply = allowError && json && Object.prototype.hasOwnProperty.call(json, 'status_code')
  if ((!res.ok && !isStatusReply) || (!allowError && json && json.error && (json.error.message || json.error.code))) {
    const msg = json?.error?.message || json?.message || 'Pesapal error ' + res.status
    throw new Error('Pesapal: ' + msg)
  }
  return json
}

// The token lasts 5 minutes. Keep it for 4 so warm servers reuse it.
let cachedToken = null

export async function getToken() {
  if (cachedToken && cachedToken.env === pesapalEnv() && cachedToken.expires > Date.now()) {
    return cachedToken.token
  }
  if (!isPesapalConfigured()) throw new Error('Pesapal keys are missing.')
  const json = await call('/Auth/RequestToken', {
    method: 'POST',
    body: {
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
    },
  })
  if (!json.token) throw new Error('Pesapal did not return a token. Check the consumer key and secret.')
  cachedToken = { token: json.token, env: pesapalEnv(), expires: Date.now() + 4 * 60 * 1000 }
  return json.token
}

// Finds the IPN id to send with orders.
// Order of checks: PESAPAL_IPN_ID env var, then the settings table, then register a new one and save it.
export async function getIpnId({ token, supabase, ipnUrl }) {
  if (process.env.PESAPAL_IPN_ID) return process.env.PESAPAL_IPN_ID

  const key = 'pesapal_ipn_' + pesapalEnv()
  const { data: saved } = await supabase.from('settings').select('value').eq('key', key).maybeSingle()
  if (saved?.value) {
    try {
      const parsed = JSON.parse(saved.value)
      if (parsed.url === ipnUrl && parsed.id) return parsed.id
    } catch {}
  }

  const json = await call('/URLSetup/RegisterIPN', {
    method: 'POST',
    token,
    body: { url: ipnUrl, ipn_notification_type: 'GET' },
  })
  if (!json.ipn_id) throw new Error('Pesapal did not return an IPN id.')
  await supabase
    .from('settings')
    .upsert({ key, value: JSON.stringify({ id: json.ipn_id, url: ipnUrl }), updated_at: new Date().toISOString() })
  return json.ipn_id
}

export async function submitOrder(token, payload) {
  const json = await call('/Transactions/SubmitOrderRequest', { method: 'POST', token, body: payload })
  if (!json.redirect_url || !json.order_tracking_id) {
    throw new Error('Pesapal did not return a payment link.')
  }
  return json
}

// A payment that is not finished yet comes back with status_code 0 and an error object
// (for example "Pending Payment"). That is normal, so we do not treat it as a crash.
export async function getTransactionStatus(token, orderTrackingId) {
  return call('/Transactions/GetTransactionStatus?orderTrackingId=' + encodeURIComponent(orderTrackingId), {
    token,
    allowError: true,
  })
}

// Pesapal status_code: 0 INVALID, 1 COMPLETED, 2 FAILED, 3 REVERSED
export function mapPaymentStatus(statusCode) {
  const code = Number(statusCode)
  if (code === 1) return 'paid'
  if (code === 2) return 'failed'
  if (code === 3) return 'reversed'
  return 'pending'
}
