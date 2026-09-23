import type { Letter, Person, Reply } from '../types/models'
import { supabase } from './supabaseClient'

function requireClient() {
  if (!supabase) throw new Error('Supabase não está configurado. Confira as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.')
  return supabase
}

function profilePerson(name: string): Person {
  const normalized = name.trim().toLocaleLowerCase('pt-BR')
  if (normalized === 'bia') return 'bia'
  if (normalized === 'isabel' || normalized === 'isa') return 'isabel'
  throw new Error(`O perfil "${name}" não corresponde a Isabel ou Bia.`)
}

export type PairSessionData = { person: Person; otherUserId: string; firstAccessCompleted: boolean; letters: Letter[] }

export async function loadPairData(userId: string): Promise<PairSessionData> {
  const client = requireClient()
  const { data: profiles, error: profileError } = await client.from('profiles').select('id, display_name, first_access_completed_at')
  if (profileError) throw profileError
  const ownProfile = profiles?.find(profile => profile.id === userId)
  if (!ownProfile) throw new Error('Esta conta ainda não está cadastrada como Isabel ou Bia no banco de dados.')
  const person = profilePerson(ownProfile.display_name)
  const otherProfile = profiles?.find(profile => profile.id !== userId)
  if (!otherProfile) throw new Error('O perfil da outra pessoa ainda não foi configurado no Supabase.')
  const personById = new Map<string, Person>((profiles ?? []).map(profile => [profile.id, profilePerson(profile.display_name)]))

  const [letterResult, readResult, replyResult, envelopeResult] = await Promise.all([
    client.from('letters').select('id, author_id, recipient_id, title, content, status, published_at, scheduled_open_at, created_at, updated_at'),
    client.from('letter_reads').select('letter_id, read_at').eq('reader_id', userId),
    client.from('replies').select('id, letter_id, author_id, content, created_at').order('created_at'),
    client.from('future_letter_envelopes').select('letter_id, author_id, scheduled_open_at').eq('recipient_id', userId).gt('scheduled_open_at', new Date().toISOString()),
  ])
  const failed = [letterResult, readResult, replyResult, envelopeResult].find(result => result.error)
  if (failed?.error) throw failed.error

  const readAt = new Map((readResult.data ?? []).map(row => [row.letter_id, row.read_at]))
  const repliesByLetter = new Map<string, Reply[]>()
  for (const row of replyResult.data ?? []) {
    const author = personById.get(row.author_id)
    if (!author) continue
    const replies = repliesByLetter.get(row.letter_id) ?? []
    replies.push({ id: row.id, author, content: row.content, createdAt: row.created_at })
    repliesByLetter.set(row.letter_id, replies)
  }

  const letters: Letter[] = (letterResult.data ?? []).flatMap(row => {
    const author = personById.get(row.author_id)
    const recipient = personById.get(row.recipient_id)
    if (!author || !recipient) return []
    return [{ id: row.id, author, recipient, title: row.title, content: row.content, status: row.status as Letter['status'], publishedAt: row.published_at ?? undefined, createdAt: row.created_at, updatedAt: row.updated_at, scheduledOpenAt: row.scheduled_open_at ?? undefined, readAt: readAt.get(row.id), replies: repliesByLetter.get(row.id) ?? [] }]
  })

  // The view exposes envelope metadata only. Never fetch future letter titles or contents.
  for (const row of envelopeResult.data ?? []) {
    const author = personById.get(row.author_id)
    if (!author) continue
    letters.push({ id: row.letter_id, author, recipient: person, title: 'Uma carta está esperando por você', content: '', status: 'published', createdAt: row.scheduled_open_at, updatedAt: row.scheduled_open_at, publishedAt: row.scheduled_open_at, scheduledOpenAt: row.scheduled_open_at, replies: [] })
  }

  return { person, otherUserId: otherProfile.id, firstAccessCompleted: Boolean(ownProfile.first_access_completed_at), letters }
}

export async function saveLetterRecord(input: { id?: string; authorId: string; recipientId: string; title: string; content: string; status: 'draft' | 'published'; scheduledOpenAt: string | null; publishedAt?: string | null }) {
  const client = requireClient()
  const record = {
    author_id: input.authorId,
    recipient_id: input.recipientId,
    title: input.title,
    content: input.content,
    status: input.status,
    published_at: input.status === 'published' ? input.publishedAt ?? new Date().toISOString() : null,
    scheduled_open_at: input.scheduledOpenAt,
    updated_at: new Date().toISOString(),
  }
  const query = input.id
    ? client.from('letters').update(record).eq('id', input.id).select('id').single()
    : client.from('letters').insert(record).select('id').single()
  const { data, error } = await query
  if (error) throw error
  return data.id as string
}

export async function markLetterRead(letterId: string, readerId: string) {
  const client = requireClient()
  const { error } = await client.from('letter_reads').insert({ letter_id: letterId, reader_id: readerId })
  // A duplicate means the recipient already marked it read in another tab.
  if (error && error.code !== '23505') throw error
}

export async function saveReply(input: { letterId: string; authorId: string; content: string }) {
  const client = requireClient()
  const { data, error } = await client.from('replies').insert({ letter_id: input.letterId, author_id: input.authorId, content: input.content }).select('id, created_at').single()
  if (error) throw error
  return { id: data.id as string, createdAt: data.created_at as string }
}

export async function completeFirstAccess(userId: string) {
  const client = requireClient()
  const { error } = await client.from('profiles').update({ first_access_completed_at: new Date().toISOString() }).eq('id', userId)
  if (error) throw error
}

