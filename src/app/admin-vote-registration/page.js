"use client"

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'

const defaultPositions = ['President', 'Vice President', 'Secretary']
const selectablePositions = [
  'President',
  'Vice President',
  'Secretary',
  'Treasurer',
  'Auditor',
  'Public Relations Officer',
  'Sergeant-at-Arms',
  'Business Manager',
]

export default function AdminVoteRegistration() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [adminAccess, setAdminAccess] = useState('')
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [message, setMessage] = useState('')

  const [candidateName, setCandidateName] = useState('')
  const [position, setPosition] = useState(defaultPositions[0])
  const [positions, setPositions] = useState(() => [...defaultPositions])
  const [positionDialogOpen, setPositionDialogOpen] = useState(false)
  const [positionSelections, setPositionSelections] = useState(() => [...defaultPositions])
  const [users, setUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [showUserBrowser, setShowUserBrowser] = useState(false)
  const [userSearch, setUserSearch] = useState('')

  const [election, setElection] = useState(null)
  const [nominationStart, setNominationStart] = useState('')
  const [nominationEnd, setNominationEnd] = useState('')
  const [electionStart, setElectionStart] = useState('')
  const [electionEnd, setElectionEnd] = useState('')

  useEffect(() => {
    if (positions.length === 0) {
      setPositions([...defaultPositions])
      return
    }
    if (!positions.includes(position)) {
      setPosition(positions[0])
    }
  }, [positions, position])

  const openPositionDialog = () => {
    setPositionSelections(positions)
    setPositionDialogOpen(true)
  }

  const togglePositionChoice = (name) => {
    setPositionSelections(prev => (
      prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name]
    ))
  }

  const applyPositionSelections = () => {
    const ordered = selectablePositions.filter(choice => positionSelections.includes(choice))
    const next = ordered.length ? ordered : [...defaultPositions]
    setPositions(next)
    if (!next.includes(position) && next.length) {
      setPosition(next[0])
    }
    setPositionSelections(next)
    setPositionDialogOpen(false)
  }

  const closePositionDialog = () => {
    setPositionSelections(positions)
    setPositionDialogOpen(false)
  }

  async function fetchMe(tkn) {
    try {
      const res = await fetch('/api/auth/me', {
        headers: tkn ? { Authorization: 'Bearer ' + tkn } : {}
      })
      if (!res.ok) {
        setUser(null)
        setIsAdmin(false)
        return null
      }
      const j = await res.json()
      const u = j.user || null
      setUser(u)
      const adminFlag = !!(u && (u.is_admin === true || u.isAdmin === true))
      setIsAdmin(adminFlag)
      return u
    } catch (err) {
      console.error('me error', err)
      setUser(null)
      setIsAdmin(false)
      return null
    }
  }

  async function handleLogin(e) {
    e?.preventDefault()
    setMessage('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      })
      const json = await res.json()
      if (!res.ok) {
        setMessage(json.error || 'Login failed')
        setLoading(false)
        return
      }
      if (json.access) {
        localStorage.setItem('admin_access', json.access)
        setAdminAccess(json.access)
        await fetchMe(json.access)
        setMessage('Logged in')
      } else {
        setMessage('Login succeeded but no access token returned')
      }
    } catch (err) {
      console.error(err)
      setMessage('Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddCandidate(e) {
    e?.preventDefault()
    setMessage('')
    if (!isAdmin) {
      setMessage('You must be an admin to add candidates')
      return
    }
    setLoading(true)
    try {
      const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminAccess }
      const publicSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET
      if (publicSecret) headers['x-admin-secret'] = publicSecret

      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: candidateName, position })
      })

      const json = await res.json()
      if (!res.ok) {
        setMessage(json.error || 'Failed to add candidate')
      } else {
        setMessage('Candidate added')
        setCandidateName('')
      }
    } catch (err) {
      console.error(err)
      setMessage('Failed to add candidate')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('admin_access') : null
    if (stored) { setAdminAccess(stored); fetchMe(stored) }
    // fetch registered users for left panel
    fetch('/api/users').then(r=>r.json()).then(d=>setUsers(d.users || []))
    fetch('/api/elections').then(r=>r.json()).then(d=>{
      const el = d.election || null
      setElection(el)
      if (el) {
        setNominationStart(el.nomination_start_at ? new Date(el.nomination_start_at).toISOString().slice(0,16) : '')
        setNominationEnd(el.nomination_end_at ? new Date(el.nomination_end_at).toISOString().slice(0,16) : '')
        setElectionStart(el.election_start_at ? new Date(el.election_start_at).toISOString().slice(0,16) : '')
        setElectionEnd(el.election_end_at ? new Date(el.election_end_at).toISOString().slice(0,16) : '')
      }
    })
  }, [])

  return (
    <div className="min-h-screen flex items-start justify-center p-8">
      <div className="max-w-screen max-h-screen w-full rounded-lg p-6 shadow">
        <h1 className="text-2xl font-bold mb-4">Admin — Candidate Registration</h1>

        {!user && (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-sm">Username</label>
              <Input value={username} onChange={e=>setUsername(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm">Password</label>
              <Input type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={loading}>{loading ? <Spinner className="mr-2"/>: null}Sign in</Button>
              <span className="text-sm text-muted-foreground">{message}</span>
            </div>
          </form>
        )}

        {showUserBrowser && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="w-full max-w-3xl dark:bg-[#0b0b0b] bg-slate-600 text-white p-4 rounded shadow">
              <div className="flex justify-between mb-3">
                <h3 className="font-semibold">Browse registered users</h3>
                <div className='flex justify-between mb-3'>
                  <Input placeholder="Search..." value={userSearch} onChange={e=>setUserSearch(e.target.value)} className="mr-2" />
                  <Button variant="outline" className='text-gray-800' onClick={()=>setShowUserBrowser(false)}>Close</Button>
                </div>
              </div>
              <div className="max-h-72 overflow-auto ">
                {users.filter(u=> (u.username||'').toLowerCase().includes(userSearch.toLowerCase()) || (u.first_name||'').toLowerCase().includes(userSearch.toLowerCase()) || (u.last_name||'').toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                  <div key={u.id} className={`p-2 rounded cursor-pointer m-2 bg-indigo-950 hover:bg-gray-800 ${selectedUserId===u.id? 'bg-gray-800':''}`} onClick={()=>{ setSelectedUserId(u.id); setShowUserBrowser(false) }}>
                    <div className="text-sm font-medium">{u.username}</div>
                    <div className="text-xs text-muted-foreground">{u.first_name || ''} {u.last_name || ''} {u.is_admin? '· admin':''}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {positionDialogOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="w-full max-w-md rounded-lg border bg-background p-4 shadow dark:bg-[#0b0b0b]">
              <h3 className="text-lg font-semibold mb-1">Select positions</h3>
              <p className="text-sm text-muted-foreground mb-4">Choose which positions should be available when assigning candidates.</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {selectablePositions.map(name => {
                  const checked = positionSelections.includes(name)
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => togglePositionChoice(name)}
                      className="focus-visible:outline-none"
                    >
                      <Badge
                        variant={checked ? 'default' : 'outline'}
                        className={`px-3 py-1 text-sm transition cursor-pointer ${checked ? 'bg-indigo-400' : 'hover:bg-gray-400 hover:text-white'}`}
                      >
                        {name}
                      </Badge>
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Selected: {positionSelections.length}</span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={closePositionDialog}>Cancel</Button>
                  <Button onClick={applyPositionSelections}>Apply</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {user && !isAdmin && (
          <div>
            <p className="mb-2">Logged in as <strong>{user.username}</strong></p>
            <p className="text-red-600">Your account is not marked as admin.</p>
              <div className="mt-4">
                <Button variant="outline" onClick={()=>{ localStorage.removeItem('admin_access'); setAdminAccess(''); setUser(null); setIsAdmin(false) }}>Sign out</Button>
              </div>
          </div>
        )}

        {user && isAdmin && (
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 p-3 border rounded">
              <h3 className="font-medium mb-2">Registered users</h3>
              <div className="mb-2">
                <Button onClick={()=>setShowUserBrowser(true)}>Browse registered users</Button>
              </div>
              <div className="text-sm text-muted-foreground mb-3">Selected: {selectedUserId ? (users.find(u=>u.id===selectedUserId)?.username || '—') : 'None'}</div>
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm">Assign position</label>
                  <Button type="button" size="icon" variant="ghost" onClick={openPositionDialog}>
                    <Plus className="h-4 w-4" />
                    <span className="sr-only">Edit positions</span>
                  </Button>
                </div>
                <Select value={position} onValueChange={v=>setPosition(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{position}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map(p=> <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={async ()=>{
                  if (!selectedUserId) return setMessage('Select a user')
                  setLoading(true)
                  try {
                    const u = users.find(x=>x.id===selectedUserId)
                    let headers = { 'Content-Type':'application/json', Authorization: 'Bearer '+adminAccess }
                    const publicSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET
                    if (publicSecret) headers['x-admin-secret'] = publicSecret
                    const res = await fetch('/api/candidates', { method: 'POST', headers, body: JSON.stringify({ name: u.username, position }) })
                    const j = await res.json()
                    if (!res.ok) setMessage(j.error||'Failed')
                    else setMessage('Added candidate from user')
                  } catch (err) { setMessage(err.message) }
                  setLoading(false)
                }}>Add selected user as candidate</Button>
              </div>
            </div>

            <div className="col-span-1 p-3 border rounded">
              <h3 className="font-medium mb-2">Add candidate manually</h3>
              <form onSubmit={handleAddCandidate} className="space-y-3">
                <div>
                  <label className="block text-sm">Candidate name</label>
                  <Input value={candidateName} onChange={e=>setCandidateName(e.target.value)} required />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Position</label>
                    <Button type="button" size="icon" variant="ghost" onClick={openPositionDialog}>
                      <Plus className="h-4 w-4" />
                      <span className="sr-only">Edit positions</span>
                    </Button>
                  </div>
                  <Select value={position} onValueChange={v=>setPosition(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue>{position}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map(p=> <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={loading}>{loading? <Spinner className="mr-2"/>: null}Add candidate</Button>
                  <span className="text-sm text-muted-foreground">{message}</span>
                </div>
              </form>
            </div>

            <div className="col-span-1 p-3 border rounded space-y-3">
              <h3 className="font-medium">Schedule</h3>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Nomination window</h4>
                <div>
                  <label className="block text-xs text-muted-foreground">Nomination opens</label>
                  <Input type="datetime-local" value={nominationStart} onChange={e=>setNominationStart(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground">Nomination closes</label>
                  <Input type="datetime-local" value={nominationEnd} onChange={e=>setNominationEnd(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Election window</h4>
                <div>
                  <label className="block text-xs text-muted-foreground">Election opens</label>
                  <Input type="datetime-local" value={electionStart} onChange={e=>setElectionStart(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground">Election closes</label>
                  <Input type="datetime-local" value={electionEnd} onChange={e=>setElectionEnd(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={async ()=>{
                  setLoading(true)
                  try {
                    const headers = { 'Content-Type':'application/json', Authorization: 'Bearer '+adminAccess }
                    const payload = {
                      nomination_start_at: nominationStart ? new Date(nominationStart).toISOString() : null,
                      nomination_end_at: nominationEnd ? new Date(nominationEnd).toISOString() : null,
                      election_start_at: electionStart ? new Date(electionStart).toISOString() : null,
                      election_end_at: electionEnd ? new Date(electionEnd).toISOString() : null,
                    }
                    const res = await fetch('/api/elections', { method: 'POST', headers, body: JSON.stringify(payload) })
                    const j = await res.json()
                    if (!res.ok) setMessage(j.error || 'Failed to set schedule')
                    else {
                      setMessage('Schedule updated')
                      setElection(j.election)
                    }
                  } catch (err) {
                    setMessage(err.message)
                  }
                  setLoading(false)
                }}>Save schedule</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
