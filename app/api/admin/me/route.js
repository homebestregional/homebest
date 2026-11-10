import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request) {
  const auth = await requireAdmin(request)
  if (auth.response) return auth.response
  return Response.json({ user: auth.user })
}
