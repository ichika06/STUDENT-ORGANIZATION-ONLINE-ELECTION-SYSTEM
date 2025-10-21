import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function POST(req) {
  const cookie = req.headers.get('cookie') || ''
  const m = cookie.match(/(?:^|; )refresh=([^;]+)/)
  const token = m ? m[1] : null

  if (token) {
    try {
      await pool.query('UPDATE refresh_tokens SET revoked = true WHERE token = $1', [token])
    } catch (err) {
      console.error('failed revoke', err)
    }
  }

  const res = NextResponse.json({ ok: true })
  // clear cookie
  res.headers.set('Set-Cookie', `refresh=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
  return res
}
