import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import jwt from 'jsonwebtoken'

const ACCESS_SECRET = process.env.ACCESS_SECRET || 'access-secret'

async function tryRefresh(req) {
  const cookie = req.headers.get('cookie') || ''
  const m = cookie.match(/(?:^|; )refresh=([^;]+)/)
  if (!m) return null
  try {
    const token = m[1]
    const payload = jwt.verify(token, process.env.REFRESH_SECRET || 'refresh-secret')
    const db = await pool.query('SELECT revoked FROM refresh_tokens WHERE token = $1', [token])
    if (!db.rows[0] || db.rows[0].revoked) return null
    const access = jwt.sign({ sub: payload.sub }, ACCESS_SECRET, { expiresIn: '15m' })
    return access
  } catch (err) {
    return null
  }
}

export async function GET(req) {
  try {
    // aggregate votes by candidate
    const res = await pool.query('SELECT candidate, COUNT(*)::int AS votes FROM votes GROUP BY candidate')

    // try to identify current user (optional) to return their votes
    const auth = req.headers.get('authorization') || ''
    const m = auth.match(/^Bearer (.+)$/)
    let access = m ? m[1] : null
    if (!access) {
      access = await tryRefresh(req)
    }

    let myVotes = []
    if (access) {
      try {
        const payload = jwt.verify(access, ACCESS_SECRET)
        const r = await pool.query('SELECT v.candidate, c.position FROM votes v LEFT JOIN candidates c ON v.candidate = c.name WHERE v.user_id = $1', [payload.sub])
        myVotes = r.rows || []
      } catch (err) {
        // ignore - no myVotes
      }
    }

    return NextResponse.json({ results: res.rows, myVotes })
  } catch (error) {
    console.error('Error fetching votes:', error.message)
    if (error.message.includes('does not exist')) {
      return NextResponse.json(
        { 
          error: 'Database tables have not been initialized yet. Please run POST /api/db/setup first.',
          results: [],
          myVotes: []
        },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: error.message, results: [], myVotes: [] },
      { status: 500 }
    )
  }
}

export async function POST(req) {
  const auth = req.headers.get('authorization') || ''
  const m = auth.match(/^Bearer (.+)$/)
  let access = m ? m[1] : null
  if (!access) access = await tryRefresh(req)
  if (!access) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  try {
    const payload = jwt.verify(access, ACCESS_SECRET)
    const body = await req.json()
    const candidate = body.candidate
    if (!candidate) return NextResponse.json({ error: 'candidate required' }, { status: 400 })

    // disallow users who are registered as candidates from voting
    try {
      const ures = await pool.query('SELECT username FROM users WHERE id = $1', [payload.sub])
      const uname = ures.rows[0] && ures.rows[0].username
      if (uname) {
        const candCheck = await pool.query('SELECT 1 FROM candidates WHERE name = $1 LIMIT 1', [uname])
        if (candCheck.rows.length) return NextResponse.json({ error: 'candidates are not allowed to vote' }, { status: 403 })
      }
    } catch (err) {
      // ignore DB read errors here and continue to normal validation flow
    }

    // find the candidate's position
    const cRes = await pool.query('SELECT position FROM candidates WHERE name = $1 LIMIT 1', [candidate])
    if (!cRes.rows[0]) return NextResponse.json({ error: 'candidate not found' }, { status: 400 })
    const position = cRes.rows[0].position

    // check if this user already voted for this position
    const already = await pool.query("SELECT 1 FROM votes v JOIN candidates c ON v.candidate = c.name WHERE v.user_id = $1 AND c.position = $2", [payload.sub, position])
    if (already.rows.length) return NextResponse.json({ error: 'already voted for this position' }, { status: 403 })

    await pool.query('INSERT INTO votes (user_id, candidate) VALUES ($1, $2)', [payload.sub, candidate])
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'invalid token' }, { status: 401 })
  }
}

export async function DELETE(req) {
  // Check admin authorization
  const secret = req.headers.get('x-admin-secret')
  const isAdminSecret = secret && secret === (process.env.ADMIN_SECRET || 'admin-secret')
  
  let isAdminToken = false
  if (!isAdminSecret) {
    const auth = req.headers.get('authorization') || ''
    const m = auth.match(/^Bearer (.+)$/)
    if (m) {
      try {
        const payload = jwt.verify(m[1], ACCESS_SECRET)
        const r = await pool.query('SELECT is_admin FROM users WHERE id = $1', [payload.sub])
        isAdminToken = !!(r.rows[0] && r.rows[0].is_admin)
      } catch (err) {
        // not admin
      }
    }
  }

  if (!isAdminSecret && !isAdminToken) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  await pool.query('DELETE FROM votes')
  return NextResponse.json({ ok: true, message: 'all votes deleted' })
}
