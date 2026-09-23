import { Archive, Feather, Inbox, LogOut, Plus, Send } from 'lucide-react'
import type { Page, Person } from '../types/models'
import { people } from '../types/models'

export const navigationItems: { key: Page; label: string; icon: typeof Inbox }[] = [
  { key: 'inbox', label: 'Cartas', icon: Inbox },
  { key: 'sent', label: 'Minhas cartas', icon: Send },
  { key: 'drafts', label: 'Rascunhos', icon: Archive },
]

type SidebarProps = { person: Person; page: Page; unread: number; onPageChange: (page: Page) => void; onWrite: () => void; onLogout: () => void }

export default function Sidebar({ person, page, unread, onPageChange, onWrite, onLogout }: SidebarProps) {
  return <aside className="sidebar">
    <button className="brand" onClick={() => onPageChange('inbox')}><span className="brand-mark"><Feather size={18}/></span><span>nosso cantinho</span></button>
    <div className="side-label">SEU ESPAÇO</div>
    <nav className="side-nav">{navigationItems.map(item => { const Icon = item.icon; return <button key={item.key} className={`nav-item ${page === item.key ? 'active' : ''}`} onClick={() => onPageChange(item.key)}><Icon size={17}/><span>{item.label}</span>{item.key === 'inbox' && unread > 0 && <i className="nav-count">{unread}</i>}</button> })}</nav>
    <button className="write-cta" onClick={onWrite}><Plus size={17}/> Escrever uma carta</button>
    <div className="sidebar-bottom"><div className="profile"><span className="avatar">{people[person].short.slice(0,1)}</span><span><b>{people[person].name}</b><small>este é o seu espaço</small></span><button aria-label="Sair" className="icon-button logout" onClick={onLogout}><LogOut size={16}/></button></div></div>
  </aside>
}
