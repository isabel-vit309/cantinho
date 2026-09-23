import { motion } from 'framer-motion'
import { ArrowLeft, ArrowUpRight, LockKeyhole } from 'lucide-react'
import type { Letter, Person } from '../../types/models'
import { formatDate, isLetterLocked, safeLetterHtml } from '../../lib/letterUtils'
import { people } from '../../types/models'

export type LetterReadingProps = { letter: Letter; person: Person; onBack: () => void; onReply: () => void; replyText: string; setReplyText: (value: string) => void; onEdit: () => void }

export default function LetterReading({ letter, person, onBack, onReply, replyText, setReplyText, onEdit }: LetterReadingProps) {
  if (isLetterLocked(letter)) return <section className="locked-reading"><LockKeyhole size={23}/><h2>Uma carta está esperando por você.</h2><p>Ela poderá ser aberta em {formatDate(letter.scheduledOpenAt)}.</p><button className="back-button" onClick={onBack}><ArrowLeft size={15}/> voltar para as cartas</button></section>
  return <motion.article className="reading-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><button className="back-button" onClick={onBack}><ArrowLeft size={15}/> todas as cartas</button><div className="reading-rule"/><div className="reading-meta">{people[letter.author].name.toUpperCase()} <span>·</span> {formatDate(letter.publishedAt)}</div><h2>{letter.title}</h2><div className="reading-body" dangerouslySetInnerHTML={{ __html: safeLetterHtml(letter.content) }}/><div className="reading-sign">com carinho, <span>{people[letter.author].name}</span></div>
    {letter.author === person && <button className="text-button edit-published" onClick={onEdit}>editar carta <ArrowUpRight size={14}/></button>}
    {letter.replies.length > 0 && <div className="reply-section"><div className="section-caption"><span>RESPOSTAS NESTA CARTA</span><span>{letter.replies.length}</span></div>{letter.replies.map(reply => <div className="reply-card" key={reply.id}><div className="reply-meta"><span>{people[reply.author].name}</span><span>{formatDate(reply.createdAt)}</span></div><p>{reply.content}</p></div>)}</div>}
    {letter.author !== person && <div className="respond"><div className="respond-heading"><span>UMA RESPOSTA</span><small>continua nesta correspondência</small></div><textarea value={replyText} onChange={event => setReplyText(event.target.value)} placeholder="O que essa carta despertou em você?"/><div className="respond-actions"><span><LockKeyhole size={12}/> visível para vocês duas</span><button className="publish-button" disabled={!replyText.trim()} onClick={onReply}>Guardar resposta <ArrowUpRight size={14}/></button></div></div>}
  </motion.article>
}
