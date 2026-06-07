import { useRef, useCallback, useEffect } from 'react';

export function useAudio() {
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback(
    (frequency: number, duration: number = 1.5, type: OscillatorType = 'sine') => {
      if (frequency <= 0) return;

      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);

      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
      };
    },
    [getAudioContext]
  );

  const playBellSound = useCallback(
    (frequency: number) => {
      if (frequency <= 0) return;

      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const fundamental = frequency;
      const partials = [
        { ratio: 1, gain: 0.4 },
        { ratio: 2.4, gain: 0.25 },
        { ratio: 3.8, gain: 0.15 },
        { ratio: 5.2, gain: 0.1 },
        { ratio: 6.7, gain: 0.08 },
      ];

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.005);
      masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);

      masterGain.connect(ctx.destination);

      partials.forEach((partial) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(fundamental * partial.ratio, ctx.currentTime);

        gain.gain.setValueAtTime(partial.gain, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 2.5);

        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };
      });

      const timeoutId = setTimeout(() => {
        masterGain.disconnect();
      }, 2600);

      return () => clearTimeout(timeoutId);
    },
    [getAudioContext]
  );

  return { playTone, playBellSound };
}
