import { requireSocialUser, loadBrand } from '@/lib/social/guard'
import { logActivity, ACTIONS } from '@/lib/social/activity'

// The connected account library for one brand, and disconnecting an account.
//
// Tokens are read only so we can say whether one exists. The token string
// itself never goes into the response. The browser must never see it.

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const auth = await requireSocialUser(request)
  if (auth.response) return auth.response
  const { supabase, actor } = auth

  const slug = new URL(request.url).searchParams.get('brand') || 'homebest'
  const brand = await loadBrand(supabase, slug)
  if (!brand) {
    return Response.json(
      { error: 'Brand "' + slug + '" is missing. Run supabase/social_scheduler.sql first.' },
      { status: 404 }
    )
  }

  const { data: accounts, error } = await supabase
    .from('social_accounts')
    .select('id, platform, account_label, platform_account_id, access_token, token_expires_at, scopes, status, connected_at, connected_by')
    .eq('brand_id', brand.id)
    .order('platform', { ascending: true })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const safe = (accounts || []).map(function (a) {
    return {
      id: a.id,
      platform: a.platform,
      account_label: a.account_label,
      platform_account_id: a.platform_account_id,
      has_token: Boolean(a.access_token),
      token_expires_at: a.token_expires_at,
      scopes: a.scopes,
      status: a.status,
      connected_at: a.connected_at,
      connected_by: a.connected_by,
    }
  })

  return Response.json({ brand: brand, accounts: safe, viewer: { role: actor.role, label: actor.label } })
}

export async function DELETE(request) {
  const auth = await requireSocialUser(request)
  if (auth.response) return auth.response
  const { supabase, actor } = auth

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return Response.json({ error: 'Which account?' }, { status: 400 })

  const { data: account } = await supabase
    .from('social_accounts')
    .select('id, brand_id, platform, account_label')
    .eq('id', id)
    .maybeSingle()

  if (!account) return Response.json({ error: 'That account is already gone.' }, { status: 404 })

  // A scheduled post pointing at this account would be left with nowhere to go,
  // so say so instead of quietly deleting it too.
  const { data: waiting } = await supabase
    .from('post_targets')
    .select('id')
    .eq('social_account_id', id)
    .in('status', ['pending', 'publishing'])
    .limit(1)

  if (waiting && waiting.length) {
    return Response.json(
      { error: 'This account still has posts waiting to go out. Move or cancel them first.' },
      { status: 409 }
    )
  }

  const { error } = await supabase.from('social_accounts').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  await logActivity(supabase, {
    actor: actor,
    request: request,
    brandId: account.brand_id,
    action: ACTIONS.ACCOUNT_DISCONNECTED,
    entityType: 'social_account',
    entityId: account.id,
    summary: actor.label + ' removed ' + account.account_label + ' (' + account.platform + ')',
    details: { platform: account.platform, account_label: account.account_label },
  })

  return Response.json({ ok: true })
}
