import { motion } from 'framer-motion'
import { BookOpen, ChevronRight, LockKeyhole } from 'lucide-react'
import type { Letter, Person } from '../../types/models'
import { formatDate, formatDateTime, isLetterLocked } from '../../lib/letterUtils'
import { people } from '../../types/models'

type LetterCardProps = { letter: Letter; isDraft: boolean; onClick: () => void; onEdit: () => void; person: Person }

export default function LetterCard({ letter, isDraft, onClick, onEdit, person }: LetterCardProps) {
  const locked = isLetterLocked(letter)
  const fresh = letter.recipient === person && !letter.readAt && !locked
  return <motion.article layout whileHover={{ y: -2 }} className={`letter-card ${fresh ? 'fresh' : ''}`} onClick={onClick}>
    <div className="card-top"><span className={`envelope ${locked ? 'locked' : ''}`}>{locked ? <LockKeyhole size={16}/> : <BookOpen size={16}/>}</span><span className="card-date">{isDraft ? `Editada ${formatDateTime(letter.updatedAt)}` : locked ? `Abre em ${formatDate(letter.scheduledOpenAt)}` : formatDate(letter.publishedAt)}</span>{fresh && <span className="new-pill">NOVA</span>}{isDraft && <button className="edit-link" onClick={event => { event.stopPropagation(); onEdit() }}>continuar <ChevronRight size={13}/></button>}</div>
    <h2>{letter.title || 'Sem título'}</h2>
    {locked ? <p className="locked-copy">Existe uma carta esperando por você. Ela ainda não pode ser aberta.</p> : <p className="card-excerpt">{letter.content}</p>}
    <div className="card-bottom"><span>{isDraft ? 'rascunho privado' : `de ${people[letter.author].name}`}</span>{!isDraft && letter.replies.length > 0 && <span className="reply-count">{letter.replies.length} {letter.replies.length === 1 ? 'resposta' : 'respostas'}</span>}<ChevronRight size={15}/></div>
  </motion.article>
}
