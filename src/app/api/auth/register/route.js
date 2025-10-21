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
  const { username, password, firstName, lastName, role, organization, avatar } = await req.json()
  if (!username || !password) return NextResponse.json({ error: 'username and password required' }, { status: 400 })

  const hashed = bcrypt.hashSync(password, 10)
  try {
    const res = await pool.query(
      'INSERT INTO users (username, password_hash, first_name, last_name, role, organization, avatar) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, username',
      [username, hashed, firstName || null, lastName || null, role || null, organization || null, avatar || null]
    )
    const user = res.rows[0]

    const access = makeAccessToken(user)
    const refresh = makeRefreshToken(user)

    // store refresh in DB
    const decoded = jwt.decode(refresh)
    await pool.query('INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES ($1, $2, to_timestamp($3))', [refresh, user.id, decoded.exp])

    const response = NextResponse.json({ access })
    // set HttpOnly cookie
    response.headers.set('Set-Cookie', `refresh=${refresh}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`)
    return response
  } catch (err) {
    if (err.code === '23505') {
      return NextResponse.json({ error: 'username taken' }, { status: 409 })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
