const API_BASE = 'https://vagafogo-production.up.railway.app';

export const api = {
  // Reservas
  async getReservas() {
    const response = await fetch(`${API_BASE}/api/reservas`);
    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },



  async createReserva(reserva: any) {
    const response = await fetch(`${API_BASE}/api/reservas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reserva)
    });
    return response.json();
  },

  async updateReserva(id: string, reserva: any) {
    const response = await fetch(`${API_BASE}/api/reservas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reserva)
    });
    return response.json();
  },

  async deleteReserva(id: string) {
    const response = await fetch(`${API_BASE}/api/reservas/${id}`, {
      method: 'DELETE'
    });
    return response.json();
  },

  // Pacotes
  async getPacotes() {
    const response = await fetch(`${API_BASE}/api/pacotes`);
    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  async createPacote(pacote: any) {
    const response = await fetch(`${API_BASE}/api/pacotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pacote)
    });
    return response.json();
  },

  async updatePacote(id: string, pacote: any) {
    const response = await fetch(`${API_BASE}/api/pacotes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pacote)
    });
    return response.json();
  },

  async deletePacote(id: string) {
    const response = await fetch(`${API_BASE}/api/pacotes/${id}`, {
      method: 'DELETE'
    });
    return response.json();
  }
};