"use client"
import AuthPage from '@/app/auth/login/page'
import DarkMode from '@/components/darkmode'

export default function Home() {
  return (
    <>
      <AuthPage />
      <div className="fixed bottom-4 right-4 z-50">
        <DarkMode />
      </div>
    </>
  )
}
