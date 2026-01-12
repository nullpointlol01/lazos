import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function FAB({ onClick }) {
  return (
    <Button
      size="icon"
      className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40"
      onClick={onClick}
    >
      <Plus size={28} />
    </Button>
  )
}
