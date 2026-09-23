export type Person = 'isabel' | 'bia'
export type Reply = { id: string; author: Person; content: string; createdAt: string }
export type Letter = { id: string; author: Person; recipient: Person; title: string; content: string; status: 'published' | 'draft'; publishedAt?: string; createdAt: string; updatedAt: string; scheduledOpenAt?: string; readAt?: string; replies: Reply[] }
export type Page = 'inbox' | 'sent' | 'drafts' | 'write'
export const people: Record<Person, { name: string; short: string }> = { isabel: { name: 'Isabel', short: 'Isa' }, bia: { name: 'Bia', short: 'Bia' } }
