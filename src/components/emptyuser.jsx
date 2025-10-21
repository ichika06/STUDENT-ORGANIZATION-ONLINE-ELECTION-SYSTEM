import { IconBell } from "@tabler/icons-react"
import { UserRoundCheck, UserRoundPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { useRouter } from "next/navigation"

export function EmptyUser() {
  const router = useRouter()

  return (
    // center the whole component vertically and horizontally
    <div className="from-muted/50 to-background bg-gradient-to-b rounded-lg p-6">
      <Empty className="min-h-screen flex items-center justify-center p-6">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconBell />
          </EmptyMedia>
          <EmptyTitle>Not logged in</EmptyTitle>
          <EmptyDescription>
            You must be logged in to view and participate in the voting.
          </EmptyDescription>
        </EmptyHeader>

        <EmptyContent className="flex flex-col gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/auth/login')}>
            <UserRoundCheck className="mr-2" />
            Sign In
          </Button>

          <Button variant="outline" size="sm" onClick={() => router.push('/auth/login')}>
            <UserRoundPlus className="mr-2" />
            Sign Up
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  )
}
