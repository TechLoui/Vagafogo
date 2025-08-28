import { useState } from "react";
import { AdminMainContentHeader } from "../components/AdminMainContent.tsx";
import AdminDashboard from "../components/AdminDashboard.tsx";
import { OpenAgendaModal } from "../components/AdminModal.tsx";

export function Admin() {
  // Controle do modal (aberto ou fechado)
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Função para fechar o modal
  function handleClose() {
    setIsModalOpen(false);
  }

  // Função para confirmar ação no modal
  function handleConfirm() {
    // Exemplo: você pode colocar aqui a lógica de abrir agenda
    // Depois fecha o modal
    setIsModalOpen(false);
  }

  return (
    <>
      <main>

        <AdminMainContentHeader />
        <AdminDashboard />

        {/* Modal - as funções são passadas corretamente */}
        <OpenAgendaModal
          isOpen={isModalOpen}
          onClose={handleClose}
          onConfirm={handleConfirm}
        />


      </main>
    </>
  );
}
