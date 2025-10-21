"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import DarkMode from '@/components/darkmode'

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState('Student')
  const [organization, setOrganization] = useState('CES')
  const [avatarFile, setAvatarFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  async function submit(e) {
    e?.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      let payload = { username, password }
      if (mode === 'signup') {
        let avatar = null
        if (avatarFile) {
          avatar = await new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(avatarFile)
          })
        }
        payload = { ...payload, firstName, lastName, role, organization, avatar }
      }
      const res = await fetch(path, { method: 'POST', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
      const data = await res.json()
      if (data.error) {
        setMessage(data.error)
      } else if (data.access) {
        // access token returned; refresh token is set as HttpOnly cookie by the server
        localStorage.setItem('access', data.access)
        setMessage('Logged in')
        router.push('/voting')
      } else if (data.user) {
        setMessage('Registered')
      }
    } catch (err) {
      setMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{mode === 'login' ? 'Login' : 'Sign up'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm mb-1">First name</label>
                    <Input value={firstName} onChange={e=>setFirstName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Last name</label>
                    <Input value={lastName} onChange={e=>setLastName(e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-1">Role</label>
                  <Select value={role} onValueChange={v=>setRole(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue>{role}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Student">Student</SelectItem>
                      <SelectItem value="Teacher">Teacher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm mb-1">Organization</label>
                  <Input value={organization} onChange={e=>setOrganization(e.target.value)} />
                </div>

                <div>
                  <label className="block text-sm mb-1">Profile picture</label>
                  <Input type="file" accept="image/*" onChange={e=>setAvatarFile(e.target.files?.[0]||null)} />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm mb-1">Username</label>
              <Input required value={username} onChange={e=>setUsername(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Password</label>
              <Input required type="password" value={password} onChange={e=>setPassword(e.target.value)} />
            </div>

            {message && <div className="text-sm text-red-600">{message}</div>}
            <CardFooter className="flex items-center gap-2 p-0">
              <Button type="submit" disabled={loading} className="flex items-center">
                {loading ? <Spinner className="mr-2" /> : null}
                {mode === 'login' ? 'Login' : 'Sign up'}
              </Button>
              <button type="button" className="text-sm underline" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login' ? 'Create account' : 'Have an account? Login'}</button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
