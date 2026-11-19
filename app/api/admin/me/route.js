import { requireAdmin } from '@/lib/admin-auth'
import { requireSocialUser } from '@/lib/social/guard'

// Tells the admin shell who is signed in.
//
// Shop staff ('admin') pass the normal check. A hired social media manager
// ('social_manager') is not shop staff, so requireAdmin turns them away — but
// they are allowed to use the social scheduler, so we check for that too and
// let the shell decide what to show them.

export async function GET(request) {
  const auth = await requireAdmin(request)
  if (!auth.response) return Response.json({ user: auth.user })

  const social = await requireSocialUser(request)
  if (social.response) return auth.response

  return Response.json({ user: social.user })
}
