import { getAdminClient, getSiteUrl } from '@/lib/supabase-server'
import { toActor } from '@/lib/social/guard'
import { logActivity, ACTIONS } from '@/lib/social/activity'
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  listPagesWithInstagram,
  inspectToken,
  scrubTokens,
  META_SCOPES,
} from '@/lib/social/meta'

// Where Facebook sends the person back after they approve the app.
//
// A browser redirect carries no Authorization header, so this route trusts the
// one-time state cookie that /api/admin/social/connect/meta set, and nothing
// else. It saves rows to social_accounts, then sends the browser back to the
// Accounts page with a short result in the address. Never put a token in that
// address, in a log line, or in an error message.

export const dynamic = 'force-dynamic'

const STATE_COOKIE = 'hb_social_oauth_state'

function readCookie(request, name) {
  const header = request.headers.get('cookie') || ''
  const parts = header.split(';')
  for (let i = 0; i < parts.length; i++) {
    const pair = parts[i].trim()
    if (pair.indexOf(name + '=') === 0) return pair.slice(name.length + 1)
  }
  return null
}

function back(params) {
  const url = new URL(getSiteUrl() + '/admin/social/accounts')
  Object.keys(params).forEach(function (k) {
    if (params[k] !== undefined && params[k] !== null) url.searchParams.set(k, params[k])
  })
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      'Set-Cookie': STATE_COOKIE + '=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
    },
  })
}

// The person who started this, read back from the state cookie, so the
// connection lands in the activity trail under their name.
async function loadActor(supabase, actorId) {
  if (!actorId) return { id: null, role: null, label: 'Unknown user' }
  const { data } = await supabase
    .from('users')
    .select('id, email, full_name, role')
    .eq('id', actorId)
    .maybeSingle()
  return data ? toActor(data) : { id: actorId, role: null, label: 'Unknown user' }
}

export async function GET(request) {
  const params = new URL(request.url).searchParams
  const code = params.get('code')
  const returnedState = params.get('state')
  const refused = params.get('error')

  const cookie = readCookie(request, STATE_COOKIE)
  const bits = cookie ? cookie.split('.') : []
  const expectedState = bits[0] || null
  const brandId = bits[1] || null
  const actorId = bits[2] || null

  if (refused) return back({ error: 'Facebook sign-in was cancelled: ' + refused })
  if (!code || !returnedState || !expectedState) {
    return back({ error: 'That sign-in link has expired. Click Connect again.' })
  }
  if (expectedState !== returnedState || !brandId) {
    return back({ error: 'The sign-in link did not check out. Click Connect again.' })
  }

  const supabase = getAdminClient()
  const actor = await loadActor(supabase, actorId)

  try {
    const short = await exchangeCodeForToken(code)
    const long = await exchangeForLongLivedToken(short.access_token)
    const pages = await listPagesWithInstagram(long.access_token)

    if (!pages.length) {
      await logActivity(supabase, {
        actor: actor, request: request, brandId: brandId,
        action: ACTIONS.ACCOUNT_CONNECT_FAILED,
        entityType: 'social_account',
        summary: actor.label + ' tried to connect Meta but no Facebook Page came back',
        details: { connector: 'meta' },
      })
      return back({
        error: 'No Facebook Page came back. Check that this Facebook user has a role on the Page, and that the Page is ticked on the sign-in screen.',
      })
    }

    const rows = []
    const names = []

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      if (!page.access_token) continue

      const info = await inspectToken(page.access_token)
      const now = new Date().toISOString()

      rows.push({
        brand_id: brandId,
        platform: 'facebook',
        account_label: page.name,
        platform_account_id: page.id,
        access_token: page.access_token,
        refresh_token: null,
        token_expires_at: info.expiresAt,
        scopes: info.scopes || META_SCOPES,
        status: 'active',
        connected_at: now,
        connected_by: actor.id,
      })
      names.push(page.name + ' (Facebook Page)')

      const ig = page.instagram_business_account
      if (ig && ig.id) {
        const igLabel = ig.username ? '@' + ig.username : 'Instagram (' + page.name + ')'
        rows.push({
          brand_id: brandId,
          platform: 'instagram',
          // The Page token is what posts to Instagram, so it is saved here too.
          account_label: igLabel,
          platform_account_id: ig.id,
          access_token: page.access_token,
          refresh_token: null,
          token_expires_at: info.expiresAt,
          scopes: info.scopes || META_SCOPES,
          status: 'active',
          connected_at: now,
          connected_by: actor.id,
        })
        names.push(igLabel + ' (Instagram)')
      }
    }

    if (!rows.length) {
      return back({ error: 'Meta sent Pages but no Page token. Click Connect again and tick every box.' })
    }

    const { error: saveError } = await supabase
      .from('social_accounts')
      .upsert(rows, { onConflict: 'brand_id,platform,platform_account_id' })

    if (saveError) {
      await logActivity(supabase, {
        actor: actor, request: request, brandId: brandId,
        action: ACTIONS.ACCOUNT_CONNECT_FAILED,
        entityType: 'social_account',
        summary: actor.label + ' tried to connect Meta but the accounts could not be saved',
        details: { connector: 'meta', reason: scrubTokens(saveError.message) },
      })
      return back({ error: 'Could not save the connection: ' + scrubTokens(saveError.message) })
    }

    await logActivity(supabase, {
      actor: actor, request: request, brandId: brandId,
      action: ACTIONS.ACCOUNT_CONNECTED,
      entityType: 'social_account',
      summary: actor.label + ' connected ' + names.join(', '),
      details: { connector: 'meta', accounts: names, token_expires_at: rows[0].token_expires_at },
    })

    const ig = rows.filter(function (r) { return r.platform === 'instagram' }).length
    const fb = rows.filter(function (r) { return r.platform === 'facebook' }).length
    return back({ connected: fb + ' Facebook Page and ' + ig + ' Instagram account' })
  } catch (e) {
    const message = scrubTokens(e.message)
    console.error('meta sign-in failed:', message)
    await logActivity(supabase, {
      actor: actor, request: request, brandId: brandId,
      action: ACTIONS.ACCOUNT_CONNECT_FAILED,
      entityType: 'social_account',
      summary: actor.label + ' hit an error connecting Meta',
      details: { connector: 'meta', reason: message },
    })
    return back({ error: message })
  }
}
