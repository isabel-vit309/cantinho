import { Feather, Menu, Plus, X } from 'lucide-react'
import type { Page } from '../types/models'
import { navigationItems } from './Sidebar'

type MobileNavigationProps = { page: Page; unread: number; menuOpen: boolean; setMenuOpen: (open: boolean) => void; onPageChange: (page: Page) => void; onWrite: () => void; onLogout: () => void }

export default function MobileNavigation({ page, unread, menuOpen, setMenuOpen, onPageChange, onWrite, onLogout }: MobileNavigationProps) {
  return <>
    <header className="mobile-header"><button className="icon-button" aria-label="Abrir menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</button><span className="mobile-brand"><Feather size={16}/> nosso cantinho</span><button className="icon-button" aria-label="Escrever carta" onClick={onWrite}><Plus/></button></header>
    {menuOpen && <div className="mobile-menu">{navigationItems.map(item => <button key={item.key} className={page === item.key ? 'active' : ''} onClick={() => onPageChange(item.key)}>{item.label}</button>)}<button onClick={onLogout}>Sair</button></div>}
    <nav className="bottom-nav">{navigationItems.slice(0,3).map(item => { const Icon = item.icon; return <button key={item.key} className={page === item.key ? 'active' : ''} onClick={() => onPageChange(item.key)}><span className="bottom-icon"><Icon size={19}/>{item.key === 'inbox' && unread > 0 && <i/>}</span><small>{item.key === 'inbox' ? 'Cartas' : item.key === 'sent' ? 'Enviadas' : 'Rascunhos'}</small></button> })}<button onClick={onWrite}><span className="bottom-icon compose-icon"><Plus size={20}/></span><small>Escrever</small></button></nav>
  </>
}
