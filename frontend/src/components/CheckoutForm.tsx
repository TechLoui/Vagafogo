import React, { useState } from "react";

export function CheckoutForm() {
  const [form, setForm] = useState({
    numero: "",
    titular: "",
    validade: "",
    cvv: "",
    atividade: "",
    data: "",
    horario: "",
    participantes: 1,
    enderecoCep: "",
    enderecoRua: "",
    enderecoNumero: "",
    enderecoComplemento: "",
    enderecoBairro: "",
    enderecoCidade: "",
    enderecoEstado: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (response.ok) {
        alert("Reserva realizada!");
        setForm({
          numero: "",
          titular: "",
          validade: "",
          cvv: "",
          atividade: "",
          data: "",
          horario: "",
          participantes: 1,
          enderecoCep: "",
          enderecoRua: "",
          enderecoNumero: "",
          enderecoComplemento: "",
          enderecoBairro: "",
          enderecoCidade: "",
          enderecoEstado: "",
        });
      }
    } catch (error) {
      console.error("Erro:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "400px", margin: "20px auto" }}>
      <h2>Checkout</h2>

      <div style={{ marginBottom: "15px" }}>
        <label>Número do cartão</label>
        <input
          type="text"
          name="numero"
          value={form.numero}
          onChange={handleChange}
          placeholder="0000 0000 0000 0000"
          required
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label>Nome do titular</label>
        <input
          type="text"
          name="titular"
          value={form.titular}
          onChange={handleChange}
          placeholder="Nome completo"
          required
        />
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
        <div style={{ flex: 1 }}>
          <label>Válido até (MM/AA)</label>
          <input
            type="text"
            name="validade"
            value={form.validade}
            onChange={handleChange}
            placeholder="MM/AA"
            required
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>CVV</label>
          <input
            type="text"
            name="cvv"
            value={form.cvv}
            onChange={handleChange}
            placeholder="000"
            required
          />
        </div>
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label>Atividade</label>
        <input
          type="text"
          name="atividade"
          value={form.atividade}
          onChange={handleChange}
          required
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label>Data</label>
        <input
          type="date"
          name="data"
          value={form.data}
          onChange={handleChange}
          required
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label>Horário</label>
        <input
          type="time"
          name="horario"
          value={form.horario}
          onChange={handleChange}
          required
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label>Participantes</label>
        <input
          type="number"
          name="participantes"
          value={form.participantes}
          onChange={handleChange}
          min="1"
          required
        />
      </div>

      <h3>Endereço de Cobrança</h3>

      <div style={{ marginBottom: "15px" }}>
        <label>CEP</label>
        <input
          type="text"
          name="enderecoCep"
          value={form.enderecoCep}
          onChange={handleChange}
          placeholder="00000-000"
          required
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label>Rua</label>
        <input
          type="text"
          name="enderecoRua"
          value={form.enderecoRua}
          onChange={handleChange}
          required
        />
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
        <div style={{ flex: 1 }}>
          <label>Número</label>
          <input
            type="text"
            name="enderecoNumero"
            value={form.enderecoNumero}
            onChange={handleChange}
            required
          />
        </div>
        <div style={{ flex: 2 }}>
          <label>Complemento</label>
          <input
            type="text"
            name="enderecoComplemento"
            value={form.enderecoComplemento}
            onChange={handleChange}
          />
        </div>
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label>Bairro</label>
        <input
          type="text"
          name="enderecoBairro"
          value={form.enderecoBairro}
          onChange={handleChange}
          required
        />
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
        <div style={{ flex: 2 }}>
          <label>Cidade</label>
          <input
            type="text"
            name="enderecoCidade"
            value={form.enderecoCidade}
            onChange={handleChange}
            required
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>Estado</label>
          <input
            type="text"
            name="enderecoEstado"
            value={form.enderecoEstado}
            onChange={handleChange}
            placeholder="SP"
            maxLength="2"
            required
          />
        </div>
      </div>

      <button type="submit" style={{ width: "100%", padding: "10px" }}>
        Confirmar Reserva
      </button>
    </form>
  );
}
