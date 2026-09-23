import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Plus, Sparkles } from 'lucide-react'
import type { Letter, Page, Person, Reply } from './types/models'
import { people } from './types/models'
import { currentTimestamp, createId, INTRO_STORAGE_KEY, isLetterLocked, readLetters, STORAGE_KEY } from './lib/letterUtils'
import { completeFirstAccess, loadPairData, markLetterRead, saveLetterRecord, saveReply } from './lib/supabaseData'
import { supabase, supabaseConfigured } from './lib/supabaseClient'
import Welcome from './features/login/Welcome'
import FirstAccessIntro from './features/login/FirstAccessIntro'
import LetterCard from './features/letters/LetterCard'
import EmptyState from './features/letters/EmptyState'
import LetterEditor from './features/letters/LetterEditor'
import LetterReading from './features/letters/LetterReading'
import Sidebar from './layout/Sidebar'
import MobileNavigation from './layout/MobileNavigation'
import ToastNotice from './components/ToastNotice'

export default function App() {
  const [letters, setLetters] = useState<Letter[]>(readLetters)
  const [person, setPerson] = useState<Person | null>(null)
  const [page, setPage] = useState<Page>('inbox')
  const [selected, setSelected] = useState<string | null>(null)
  const [showIntro, setShowIntro] = useState(false)
  const [introIndex, setIntroIndex] = useState(-1)
  const [toast, setToast] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const [openOn, setOpenOn] = useState('')
  const [replyText, setReplyText] = useState('')
  const [editorId, setEditorId] = useState<string | null>(null)
  const [published, setPublished] = useState(false)
  const [sessionUserId, setSessionUserId] = useState<string | null>(null)
  const [otherUserId, setOtherUserId] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(!supabaseConfigured)
  const [dataLoading, setDataLoading] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    if (supabaseConfigured && supabase) {
      let alive = true
      supabase.auth.getSession().then(({ data, error }) => {
        if (!alive) return
        if (error) setAuthError(error.message)
        setSessionUserId(data.session?.user.id ?? null)
        setAuthReady(true)
      })
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSessionUserId(session?.user.id ?? null)
        if (!session) { setPerson(null); setOtherUserId(null); setLetters([]) }
        setAuthReady(true)
      })
      return () => { alive = false; subscription.unsubscribe() }
    }
    setAuthReady(true)
  }, [])

  useEffect(() => {
    if (!supabaseConfigured || !sessionUserId) return
    let alive = true
    setDataLoading(true); setAuthError('')
    const refreshLetters = () => {
      void loadPairData(sessionUserId).then(pair => {
        if (alive) setLetters(pair.letters)
      }).catch(() => undefined)
    }
    const updates = supabase?.channel(`pair-letters-${sessionUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'letters' }, refreshLetters)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'future_letter_envelopes' }, refreshLetters)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'replies' }, refreshLetters)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'letter_reads' }, refreshLetters)
      .subscribe()
    loadPairData(sessionUserId).then(pair => {
      if (!alive) return
      setPerson(pair.person); setOtherUserId(pair.otherUserId); setLetters(pair.letters)
      setPage('inbox'); setSelected(null)
      if (pair.person === 'bia' && !pair.firstAccessCompleted) { setShowIntro(true); setIntroIndex(-1) }
    }).catch(async error => {
      if (!alive) return
      setAuthError(error instanceof Error ? error.message : 'Não foi possível carregar seus dados.')
      await supabase?.auth.signOut()
    }).finally(() => { if (alive) setDataLoading(false) })
    return () => { alive = false; if (updates) void supabase?.removeChannel(updates) }
  }, [sessionUserId])

  useEffect(() => { if (!supabaseConfigured && person) localStorage.setItem(STORAGE_KEY, JSON.stringify(letters)) }, [letters, person])
  useEffect(() => { if (toast) { const timer = window.setTimeout(() => setToast(''), 2800); return () => clearTimeout(timer) } }, [toast])

  const visibleLetters = useMemo(() => letters.filter(letter => letter.status === 'published' && (letter.author === person || letter.recipient === person)), [letters, person])
  const unread = visibleLetters.filter(letter => letter.recipient === person && !letter.readAt && !isLetterLocked(letter)).length
  const nextOpening = letters.filter(letter => letter.recipient === person && letter.scheduledOpenAt && isLetterLocked(letter)).map(letter => letter.scheduledOpenAt!).sort()[0]
  const activeLetter = letters.find(letter => letter.id === selected)
  const other: Person = person === 'bia' ? 'isabel' : 'bia'

  useEffect(() => {
    if (!supabaseConfigured || !sessionUserId || !nextOpening) return
    const delay = Math.min(Math.max(new Date(nextOpening).getTime() - Date.now() + 100, 100), 2_147_000_000)
    const timer = window.setTimeout(() => {
      void loadPairData(sessionUserId).then(pair => setLetters(pair.letters)).catch(() => undefined)
    }, delay)
    return () => clearTimeout(timer)
  }, [sessionUserId, nextOpening])

  function enter(who: Person) {
    if (supabaseConfigured) return
    setPerson(who); setPage('inbox'); setSelected(null)
    if (who === 'bia' && !localStorage.getItem(INTRO_STORAGE_KEY)) { setShowIntro(true); setIntroIndex(-1) }
  }

  async function finishIntro() {
    try {
      if (supabaseConfigured && sessionUserId) await completeFirstAccess(sessionUserId)
      else localStorage.setItem(INTRO_STORAGE_KEY, 'done')
      setShowIntro(false); setPage('inbox')
    } catch { setToast('Não foi possível salvar a conclusão da introdução. Tente novamente.') }
  }
  async function logout() {
    if (supabaseConfigured) await supabase?.auth.signOut()
    setPerson(null); setSelected(null); setPage('inbox'); setShowIntro(false)
  }
  async function signIn(username: string, password: string) {
    if (!supabase) return
    setSigningIn(true); setAuthError('')
    try {
      const { data, error } = await supabase.functions.invoke('username-login', { body: { username, password } })
      if (error || !data?.access_token || !data?.refresh_token) { setAuthError('Nome ou senha incorretos.'); return }
      const { error: sessionError } = await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token })
      if (sessionError) setAuthError('Não foi possível iniciar sua sessão. Tente novamente.')
    } catch { setAuthError('Não foi possível entrar agora. Confira sua conexão e tente novamente.') }
    finally { setSigningIn(false) }
  }
  function viewPage(next: Page) { setPage(next); setSelected(null); setMenuOpen(false); setEditorId(null); setPublished(false) }

  function openLetter(letter: Letter) {
    setSelected(letter.id); setPage('inbox')
    if (letter.recipient === person && !letter.readAt && !isLetterLocked(letter)) {
      setLetters(previous => previous.map(item => item.id === letter.id ? { ...item, readAt: currentTimestamp() } : item))
      if (supabaseConfigured && sessionUserId) void markLetterRead(letter.id, sessionUserId).catch(() => setToast('Não foi possível atualizar o estado de leitura.'))
    }
  }

  function beginEdit(letter?: Letter) {
    setEditorId(letter?.id ?? null); setDraftTitle(letter?.title ?? ''); setDraftBody(letter?.content ?? '')
    setOpenOn(letter?.scheduledOpenAt?.slice(0, 10) ?? ''); setSelected(null); setPage('write'); setPublished(false)
  }

  async function saveLetter(status: 'draft' | 'published') {
    if (!person || !draftTitle.trim() || !draftBody.trim()) return
    const original = letters.find(letter => letter.id === editorId)
    let savedId = original?.id ?? createId()
    const publishedAt = status === 'published' ? original?.publishedAt ?? currentTimestamp() : undefined
    if (supabaseConfigured && sessionUserId && otherUserId) {
      try {
        savedId = await saveLetterRecord({ id: original?.id, authorId: sessionUserId, recipientId: otherUserId, title: draftTitle.trim(), content: draftBody.trim(), status, scheduledOpenAt: openOn ? new Date(`${openOn}T00:00:00`).toISOString() : null, publishedAt })
      } catch (error) { setToast(error instanceof Error ? error.message : 'Não foi possível salvar a carta.'); return }
    }
    const item: Letter = {
      id: savedId, author: person, recipient: original?.recipient ?? other,
      title: draftTitle.trim(), content: draftBody.trim(), status,
      createdAt: original?.createdAt ?? currentTimestamp(), updatedAt: currentTimestamp(),
      ...(publishedAt ? { publishedAt } : {}),
      ...(openOn ? { scheduledOpenAt: new Date(`${openOn}T00:00:00`).toISOString() } : {}),
      replies: original?.replies ?? [],
    }
    setLetters(previous => original ? previous.map(letter => letter.id === original.id ? item : letter) : [item, ...previous])
    if (status === 'published') {
      setPublished(true)
      setTimeout(() => { setPublished(false); setPage('sent'); setSelected(item.id) }, 1700)
    } else { setPage('drafts'); setToast('Rascunho guardado com carinho.') }
  }

  async function addReply() {
    if (!person || !activeLetter || !replyText.trim()) return
    let reply: Reply = { id: createId(), author: person, content: replyText.trim(), createdAt: currentTimestamp() }
    if (supabaseConfigured && sessionUserId) {
      try {
        const saved = await saveReply({ letterId: activeLetter.id, authorId: sessionUserId, content: replyText.trim() })
        reply = { ...reply, id: saved.id, createdAt: saved.createdAt }
      } catch (error) { setToast(error instanceof Error ? error.message : 'Não foi possível salvar a resposta.'); return }
    }
    setLetters(previous => previous.map(letter => letter.id === activeLetter.id ? { ...letter, replies: [...letter.replies, reply] } : letter))
    setReplyText(''); setToast('Sua resposta foi guardada nessa carta.')
  }

  if (!person) {
    if (supabaseConfigured && (!authReady || (sessionUserId && dataLoading))) return <main className="auth-loading">Carregando seu espaço…</main>
    return <Welcome supabaseEnabled={supabaseConfigured} authError={authError} signingIn={signingIn} onEnterDemo={enter} onSignIn={signIn}/>
  }

  const pageTitle = page === 'inbox' ? 'Cartas para você' : page === 'sent' ? 'Minhas cartas' : page === 'drafts' ? 'Rascunhos' : `Uma carta para ${people[other].name}`
  const listed = page === 'inbox'
    ? visibleLetters.filter(letter => letter.recipient === person).sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
    : page === 'sent'
      ? visibleLetters.filter(letter => letter.author === person).sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
      : page === 'drafts'
        ? letters.filter(letter => letter.author === person && letter.status === 'draft').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        : []

  return <div className="app-shell">
    <Sidebar person={person} page={page} unread={unread} onPageChange={viewPage} onWrite={() => beginEdit()} onLogout={logout}/>
    <MobileNavigation page={page} unread={unread} menuOpen={menuOpen} setMenuOpen={setMenuOpen} onPageChange={viewPage} onWrite={() => beginEdit()} onLogout={logout}/>
    <main className="main-area">
      <div className="page-wrap">
        <div className="page-top"><div><div className="eyebrow">QUARTA-FEIRA, 23 DE SETEMBRO</div><h1>{pageTitle}</h1></div>{page !== 'write' && <button className="desktop-write" onClick={() => beginEdit()}><Plus size={16}/> Nova carta</button>}</div>
        {page === 'write' ? <LetterEditor title={draftTitle} body={draftBody} date={openOn} setTitle={setDraftTitle} setBody={setDraftBody} setDate={setOpenOn} onSave={saveLetter} onCancel={() => viewPage('inbox')} published={published} other={people[other].name}/>
          : selected && activeLetter ? <LetterReading letter={activeLetter} person={person} onBack={() => setSelected(null)} onReply={addReply} replyText={replyText} setReplyText={setReplyText} onEdit={() => beginEdit(activeLetter)}/>
              : <>
                {page === 'inbox' && unread > 0 && <div className="unread-note"><span className="unread-dot"/><span><b>{unread} {unread === 1 ? 'carta nova' : 'cartas novas'}</b> esperando por você</span><Sparkles size={15}/></div>}
                {page === 'inbox' && <div className="section-caption"><span>DA {people[other].name.toUpperCase()}</span><span>{listed.length} {listed.length === 1 ? 'CARTA' : 'CARTAS'}</span></div>}
                {listed.length ? <div className="letter-list">{listed.map(letter => <LetterCard key={letter.id} letter={letter} isDraft={page === 'drafts'} onClick={() => page === 'drafts' ? beginEdit(letter) : openLetter(letter)} onEdit={() => beginEdit(letter)} person={person}/>)}</div> : <EmptyState page={page} onWrite={() => beginEdit()}/>}
                {page === 'inbox' && <div className="end-note"><span/> cada carta chega no seu tempo <span/></div>}
              </>}
      </div>
    </main>
    <AnimatePresence>{showIntro && <FirstAccessIntro index={introIndex} setIndex={setIntroIndex} onFinish={finishIntro}/>}</AnimatePresence>
    <ToastNotice message={toast}/>
  </div>
}
