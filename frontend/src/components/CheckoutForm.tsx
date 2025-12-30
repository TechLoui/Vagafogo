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

      <button type="submit" style={{ width: "100%", padding: "10px" }}>
        Confirmar Reserva
      </button>
    </form>
  );
}
