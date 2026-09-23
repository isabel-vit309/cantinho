import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'

export default function ToastNotice({ message }: { message: string }) {
  return <AnimatePresence>{message && <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="toast"><Check size={16}/>{message}</motion.div>}</AnimatePresence>
}
