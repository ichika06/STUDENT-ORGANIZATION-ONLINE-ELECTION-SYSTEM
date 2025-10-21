import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const ACCESS_SECRET = process.env.ACCESS_SECRET || 'access-secret'
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'refresh-secret'

function makeAccessToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, ACCESS_SECRET, { expiresIn: '15m' })
}

function makeRefreshToken(user) {
  return jwt.sign({ sub: user.id }, REFRESH_SECRET, { expiresIn: '7d' })
}

export async function POST(req) {
  const { username, password } = await req.json()
  if (!username || !password) return NextResponse.json({ error: 'username and password required' }, { status: 400 })

  const res = await pool.query('SELECT id, username, password_hash FROM users WHERE username = $1', [username])
  const user = res.rows[0]
  if (!user) return NextResponse.json({ error: 'invalid credentials' }, { status: 401 })

  const ok = bcrypt.compareSync(password, user.password_hash)
  if (!ok) return NextResponse.json({ error: 'invalid credentials' }, { status: 401 })

  const access = makeAccessToken(user)
  const refresh = makeRefreshToken(user)

  const decoded = jwt.decode(refresh)
  await pool.query('INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, to_timestamp($3))', [refresh, user.id, decoded.exp])

  const response = NextResponse.json({ access })
  response.headers.set('Set-Cookie', `refresh=${refresh}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`)
  return response
}
