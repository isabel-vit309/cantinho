import { useState, type FormEvent } from 'react'
import { ArrowUpRight, Feather, LoaderCircle } from 'lucide-react'
import type { Person } from '../../types/models'
import './login.css'

type WelcomeProps = {
  supabaseEnabled: boolean
  authError: string
  signingIn: boolean
  onEnterDemo: (person: Person) => void
  onSignIn: (username: string, password: string) => Promise<void>
}

export default function Welcome({ supabaseEnabled, authError, signingIn, onEnterDemo, onSignIn }: WelcomeProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSignIn(username, password)
  }

  return (
    <main className="welcome">
      <div className="welcome-grain" />
      <div className="welcome-card">
        <div className="welcome-mark"><Feather size={22} /></div>
        <h1>Algumas coisas<br />merecem ficar.</h1>
        <p>Que sempre exista um cantinho só nosso</p>
        {supabaseEnabled ? (
          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="login-username">Nome</label>
            <input id="login-username" autoComplete="username" type="text" placeholder="Bia ou Isa" required value={username} onChange={event => setUsername(event.target.value)} />
            <label htmlFor="login-password">Senha</label>
            <input id="login-password" autoComplete="current-password" type="password" required value={password} onChange={event => setPassword(event.target.value)} />
            {authError && <p className="login-error" role="alert">{authError}</p>}
            <button className="login-submit" type="submit" disabled={signingIn}>{signingIn ? <><LoaderCircle className="login-spinner" size={15}/> Entrando...</> : <>Entrar <ArrowUpRight size={16}/></>}</button>
          </form>
        ) : (
          <div className="welcome-choices">
            <button onClick={() => onEnterDemo('isabel')}><span>Entrar como Isa</span><ArrowUpRight size={16} /></button>
            <button onClick={() => onEnterDemo('bia')}><span>Entrar como Bia</span><ArrowUpRight size={16} /></button>
          </div>
        )}
      </div>
    </main>
  )
}
