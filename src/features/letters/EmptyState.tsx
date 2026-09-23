import { Archive, Feather, ArrowUpRight } from "lucide-react";
import type { Page } from "../../types/models";

type EmptyStateProps = { page: Page; onWrite: () => void };

export default function EmptyState({ page, onWrite }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        {page === "drafts" ? <Archive size={21} /> : <Feather size={22} />}
      </div>
      <h2>
        {page === "drafts"
          ? "Nenhum rascunho por aqui."
          : page === "sent"
            ? "Suas palavras ainda estão por vir."
            : "Ainda não chegou nenhuma carta."}
      </h2>
      <p>
        {page === "inbox"
          ? "Quando uma carta chegar, ela vai encontrar um lugar aqui."
          : page === "drafts"
            ? "Pode guardar uma ideia para terminar quando quiser."
            : "Quando uma carta sua estiver pronta, ela ficará guardada aqui."}
      </p>
      {page !== "inbox" && (
        <button className="text-button" onClick={onWrite}>
          começar uma carta <ArrowUpRight size={14} />
        </button>
      )}
    </div>
  );
}
