import DOMPurify from 'dompurify'
import type { Letter } from '../types/models'

export const STORAGE_KEY = 'nosso-cantinho-letters-v1'
export const INTRO_STORAGE_KEY = 'nosso-cantinho-bia-intro-v1'
export const introLines = ['Eu queria te dar uma carta.', 'Mas eu sabia que talvez isso pudesse te colocar em uma situação difícil.', 'Então pensei em outra coisa.', 'Um lugar onde algumas palavras pudessem ficar.', 'Onde eu pudesse escrever para você.', 'E onde você também pudesse escrever para mim.', 'Sem pressa.', 'Sem precisar guardar nada em uma gaveta.', 'Só um cantinho nosso.']

export const sampleLetters: Letter[] = [
  { id: 'l1', author: 'bia', recipient: 'isabel', title: 'Uma coisa que eu queria te contar', content: 'Às vezes eu penso em como algumas coisas bonitas chegam sem fazer barulho.\n\nVocê chegou assim. E, sem perceber, foi deixando os meus dias um pouco mais leves.\n\nQueria que você soubesse disso hoje.', status: 'published', publishedAt: '2026-09-22T14:15:00.000Z', createdAt: '2026-09-22T14:15:00.000Z', updatedAt: '2026-09-22T14:15:00.000Z', replies: [] },
  { id: 'l2', author: 'bia', recipient: 'isabel', title: 'Para quando o dia for longo', content: 'Respira. Você não precisa resolver tudo agora.\n\nGuarda um espacinho do dia só pra você — e lembra que estou aqui.', status: 'published', publishedAt: '2026-09-19T12:00:00.000Z', createdAt: '2026-09-19T12:00:00.000Z', updatedAt: '2026-09-19T12:00:00.000Z', readAt: '2026-09-20T12:00:00.000Z', replies: [{ id: 'r1', author: 'isabel', content: 'Li isso na hora certa. Obrigada por me conhecer tão bem.', createdAt: '2026-09-20T13:20:00.000Z' }] },
  { id: 'l3', author: 'isabel', recipient: 'bia', title: 'Sobre nós', content: 'Gosto da calma que existe quando estamos juntas.\n\nNão precisa ser uma ocasião especial para eu lembrar que você é uma das minhas partes favoritas dos dias comuns.', status: 'published', publishedAt: '2026-09-21T09:30:00.000Z', createdAt: '2026-09-21T09:30:00.000Z', updatedAt: '2026-09-21T09:30:00.000Z', readAt: '2026-09-22T09:30:00.000Z', replies: [] },
  { id: 'l4', author: 'isabel', recipient: 'bia', title: 'Para abrir no nosso próximo aniversário', content: 'Espero que a gente esteja lendo isso com um sorriso. Tenho tanta coisa boa pra agradecer por ter vivido ao seu lado.', status: 'published', publishedAt: '2026-09-18T10:00:00.000Z', createdAt: '2026-09-18T10:00:00.000Z', updatedAt: '2026-09-18T10:00:00.000Z', scheduledOpenAt: '2027-09-23T00:00:00.000Z', replies: [] },
  { id: 'd1', author: 'isabel', recipient: 'bia', title: 'Carta para você', content: 'Ainda estou encontrando as palavras certas...', status: 'draft', createdAt: '2026-09-23T03:31:00.000Z', updatedAt: '2026-09-23T03:31:00.000Z', replies: [] },
]

export const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(new Date(value)) : ''
export const formatDateTime = (value?: string) => value ? new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : ''
export const currentTimestamp = () => new Date().toISOString()
export const createId = () => crypto.randomUUID?.() ?? String(Date.now())
export const isLetterLocked = (letter: Letter) => !!letter.scheduledOpenAt && new Date(letter.scheduledOpenAt) > new Date()

export function readLetters(): Letter[] {
  try { const value = localStorage.getItem(STORAGE_KEY); return value ? JSON.parse(value) as Letter[] : sampleLetters } catch { return sampleLetters }
}

const escapeHtml = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')
export const editorHtml = (text: string) => !text ? '' : /<[a-z][\s\S]*>/i.test(text) ? DOMPurify.sanitize(text) : text.split(/\n\n+/).map(p => `<p>${escapeHtml(p).replaceAll('\n', '<br>')}</p>`).join('')
export const safeLetterHtml = (text: string) => DOMPurify.sanitize(editorHtml(text), { ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'blockquote', 'div', 'span'], ALLOWED_ATTR: ['style'] })
