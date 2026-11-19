import { requireSocialUser, loadBrand } from '@/lib/social/guard'
import { logActivity, ACTIONS } from '@/lib/social/activity'
import { authorizeUrl, metaRedirectUri } from '@/lib/social/meta'

// Starts the Meta sign-in for Instagram and Facebook.
//
// This route does not send the browser anywhere itself. The Accounts page calls
// it with the signed-in user's token, gets a URL back, and then moves the
// window. So the role check happens before anything leaves our site, while the
// callback — which arrives as a plain browser redirect with no Authorization
// header — is protected by the one-time state cookie set here.
//
// The cookie also carries who started it, so the connection that comes back is
// recorded under their name.

export const dynamic = 'force-dynamic'

const STATE_COOKIE = 'hb_social_oauth_state'
const TEN_MINUTES = 600

export async function GET(request) {
  const auth = await requireSocialUser(request)
  if (auth.response) return auth.response
  const { supabase, actor } = auth

  if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
    return Response.json(
      { error: 'META_APP_ID and META_APP_SECRET are not set yet. Add them in Vercel with no quotes, then redeploy.' },
      { status: 400 }
    )
  }

  const slug = new URL(request.url).searchParams.get('brand') || 'homebest'
  const brand = await loadBrand(supabase, slug)
  if (!brand) {
    return Response.json(
      { error: 'Brand "' + slug + '" is missing. Run supabase/social_scheduler.sql first.' },
      { status: 404 }
    )
  }

  await logActivity(supabase, {
    actor: actor,
    request: request,
    brandId: brand.id,
    action: ACTIONS.ACCOUNT_CONNECT_STARTED,
    entityType: 'social_account',
    summary: actor.label + ' started connecting Instagram and Facebook',
    details: { connector: 'meta', brand: brand.slug },
  })

  const state = crypto.randomUUID()
  const value = state + '.' + brand.id + '.' + actor.id
  const secure = metaRedirectUri().startsWith('https://') ? ' Secure;' : ''

  return new Response(JSON.stringify({ url: authorizeUrl(state), redirectUri: metaRedirectUri() }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': STATE_COOKIE + '=' + value + '; Path=/; HttpOnly; SameSite=Lax;' + secure + ' Max-Age=' + TEN_MINUTES,
    },
  })
}
