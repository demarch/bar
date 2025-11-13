import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private currentCaixaId: number | null = null;

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('✓ Socket conectado:', this.socket?.id);

      // Reconectar à sala do caixa se houver
      if (this.currentCaixaId) {
        this.joinCaixa(this.currentCaixaId);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('✗ Socket desconectado');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentCaixaId = null;
    }
  }

  joinCaixa(movimentoCaixaId: number): void {
    if (this.socket) {
      this.currentCaixaId = movimentoCaixaId;
      this.socket.emit('join:caixa', movimentoCaixaId);
      console.log(`✓ Entrou na sala caixa:${movimentoCaixaId}`);
    }
  }

  leaveCaixa(movimentoCaixaId: number): void {
    if (this.socket) {
      this.socket.emit('leave:caixa', movimentoCaixaId);
      this.currentCaixaId = null;
      console.log(`✓ Saiu da sala caixa:${movimentoCaixaId}`);
    }
  }

  // Emitir eventos
  emitComandaAtualizada(data: any): void {
    if (this.socket) {
      this.socket.emit('comanda:atualizada', data);
    }
  }

  emitComandaCriada(data: any): void {
    if (this.socket) {
      this.socket.emit('comanda:criada', data);
    }
  }

  emitComandaFechada(data: any): void {
    if (this.socket) {
      this.socket.emit('comanda:fechada', data);
    }
  }

  emitQuartoOcupado(data: any): void {
    if (this.socket) {
      this.socket.emit('quarto:ocupado', data);
    }
  }

  emitQuartoLiberado(data: any): void {
    if (this.socket) {
      this.socket.emit('quarto:liberado', data);
    }
  }

  // Ouvir eventos
  onComandaAtualizada(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('comanda:atualizada', callback);
    }
  }

  onComandaCriada(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('comanda:criada', callback);
    }
  }

  onComandaFechada(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('comanda:fechada', callback);
    }
  }

  onQuartoOcupado(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('quarto:ocupado', callback);
    }
  }

  onQuartoLiberado(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('quarto:liberado', callback);
    }
  }

  // Remover listeners
  off(event: string): void {
    if (this.socket) {
      this.socket.off(event);
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export default new SocketService();
