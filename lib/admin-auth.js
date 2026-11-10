import 'server-only'
import { revalidatePath } from 'next/cache'
import { getAdminClient } from '@/lib/supabase-server'

// Checks the "Authorization: Bearer <token>" header on admin API calls.
// Only people in the users table with role 'admin' get through.
export async function requireAdmin(request) {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return { response: Response.json({ error: 'Please sign in.' }, { status: 401 }) }

  const supabase = getAdminClient()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) {
    return { response: Response.json({ error: 'Please sign in again.' }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, email, full_name, role')
    .eq('id', data.user.id)
    .maybeSingle()
  if (!profile || profile.role !== 'admin') {
    return { response: Response.json({ error: 'This account is not a Homebest admin.' }, { status: 403 }) }
  }

  return { supabase, user: profile }
}

// After products, categories or delivery fees change, refresh the public pages.
export function refreshShop() {
  revalidatePath('/', 'layout')
}

export function badRequest(message) {
  return Response.json({ error: message }, { status: 400 })
}

export function serverError(error) {
  console.error(error)
  return Response.json({ error: error?.message || 'Something went wrong.' }, { status: 500 })
}
