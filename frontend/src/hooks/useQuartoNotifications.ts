import { useEffect, useRef } from 'react';
import { useQuartos } from './useQuartos';

interface NotificationConfig {
  title: string;
  message: string;
  type: 'warning' | 'error';
  sound?: boolean;
}

export const useQuartoNotifications = () => {
  const { quartosOcupados } = useQuartos();
  const notifiedQuartos = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!quartosOcupados || quartosOcupados.length === 0) {
      notifiedQuartos.current.clear();
      return;
    }

    quartosOcupados.forEach((ocupacao) => {
      const minutosDecorridos = ocupacao.minutos_decorridos;
      const quartoId = `${ocupacao.id}`;

      // Alerta de 1h 45min (105 minutos)
      const alertKey105 = `${quartoId}-105`;
      if (minutosDecorridos >= 105 && minutosDecorridos < 120 && !notifiedQuartos.current.has(alertKey105)) {
        showNotification({
          title: `Quarto ${ocupacao.numero_quarto} - Atenção!`,
          message: `Aproximando de 2 horas (${formatarTempo(minutosDecorridos)})`,
          type: 'warning',
          sound: true,
        });
        notifiedQuartos.current.add(alertKey105);
      }

      // Alerta de 2h (120 minutos)
      const alertKey120 = `${quartoId}-120`;
      if (minutosDecorridos >= 120 && !notifiedQuartos.current.has(alertKey120)) {
        showNotification({
          title: `Quarto ${ocupacao.numero_quarto} - URGENTE!`,
          message: `Ultrapassou 2 horas de ocupação (${formatarTempo(minutosDecorridos)})`,
          type: 'error',
          sound: true,
        });
        notifiedQuartos.current.add(alertKey120);
      }

      // Alerta a cada 30 minutos após 2h
      if (minutosDecorridos > 120) {
        const intervalo = Math.floor((minutosDecorridos - 120) / 30);
        const alertKeyExtra = `${quartoId}-extra-${intervalo}`;

        if (!notifiedQuartos.current.has(alertKeyExtra)) {
          showNotification({
            title: `Quarto ${ocupacao.numero_quarto} - ATENÇÃO!`,
            message: `Ocupado há ${formatarTempo(minutosDecorridos)}`,
            type: 'error',
            sound: true,
          });
          notifiedQuartos.current.add(alertKeyExtra);
        }
      }
    });

    // Limpar notificações de quartos que não existem mais
    const currentQuartoIds = new Set(quartosOcupados.map((o) => `${o.id}`));
    notifiedQuartos.current.forEach((key) => {
      const quartoId = key.split('-')[0];
      if (!currentQuartoIds.has(quartoId)) {
        notifiedQuartos.current.delete(key);
      }
    });
  }, [quartosOcupados]);

  const formatarTempo = (minutos: number): string => {
    const horas = Math.floor(minutos / 60);
    const mins = Math.floor(minutos % 60);
    return `${horas}h ${mins}min`;
  };

  const showNotification = (config: NotificationConfig) => {
    // Notificação do navegador (se permitido)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(config.title, {
        body: config.message,
        icon: '/favicon.ico',
        tag: config.title, // Previne notificações duplicadas
      });
    }

    // Toast notification (visual)
    // Você pode integrar com uma biblioteca de toast como react-hot-toast
    console.log(`[NOTIFICAÇÃO ${config.type.toUpperCase()}]`, config.title, config.message);

    // Som de alerta (opcional)
    if (config.sound) {
      playNotificationSound(config.type);
    }
  };

  const playNotificationSound = (type: 'warning' | 'error') => {
    try {
      // Criar som usando Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configurar som baseado no tipo
      if (type === 'warning') {
        // Som de alerta suave (toque único)
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } else {
        // Som de alerta urgente (bips duplos)
        oscillator.frequency.value = 1000;
        gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);

        // Segundo bip
        setTimeout(() => {
          const oscillator2 = audioContext.createOscillator();
          const gainNode2 = audioContext.createGain();
          oscillator2.connect(gainNode2);
          gainNode2.connect(audioContext.destination);
          oscillator2.frequency.value = 1000;
          gainNode2.gain.setValueAtTime(0.4, audioContext.currentTime);
          gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          oscillator2.start(audioContext.currentTime);
          oscillator2.stop(audioContext.currentTime + 0.2);
        }, 300);
      }
    } catch (error) {
      console.error('Erro ao tocar som de notificação:', error);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  };

  return {
    requestNotificationPermission,
  };
};
