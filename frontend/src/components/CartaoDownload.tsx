import React from "react";

export function CartaoDownload() {
  const handleDownload = async () => {
    try {
      const response = await fetch("/api/cartoes/download");
      if (!response.ok) {
        alert("Erro ao baixar arquivo");
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cartoes.json";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao baixar arquivo");
    }
  };

  return (
    <button onClick={handleDownload} style={{ padding: "10px 20px", cursor: "pointer" }}>
      📥 Baixar Cartões (JSON)
    </button>
  );
}
