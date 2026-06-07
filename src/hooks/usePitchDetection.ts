import { useState, useRef, useCallback, useEffect } from 'react';

export interface RecordingState {
  isRecording: boolean;
  duration: number;
  detectedFrequency: number | null;
  confidence: number;
}

export function usePitchDetection() {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    duration: 0,
    detectedFrequency: null,
    confidence: 0,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const frequenciesRef = useRef<number[]>([]);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const autoCorrelate = useCallback((buf: Float32Array, sampleRate: number): number | null => {
    const SIZE = buf.length;
    const rms = calculateRMS(buf);

    if (rms < 0.01) {
      return null;
    }

    const r1 = 0;
    const r2 = SIZE - 1;
    const thres = 0.2;

    let rms1 = 0;
    for (let i = 0; i < SIZE / 2; i++) {
      rms1 += Math.abs(buf[i]);
    }
    rms1 /= SIZE / 2;

    if (rms1 < thres) {
      return null;
    }

    let c1 = 0;
    let c2 = SIZE - 1;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buf[i]) < thres / 10) {
        c1 = i;
        break;
      }
    }
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buf[SIZE - i]) < thres / 10) {
        c2 = SIZE - i;
        break;
      }
    }

    const trimLen = Math.min(c1, c2);
    const trimmed = new Float32Array(SIZE - trimLen * 2);
    for (let i = trimLen; i < SIZE - trimLen; i++) {
      trimmed[i - trimLen] = buf[i];
    }

    const c = new Float32Array(trimmed.length);
    for (let i = 0; i < trimmed.length; i++) {
      for (let j = 0; j < trimmed.length - i; j++) {
        c[i] += trimmed[j] * trimmed[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) {
      d++;
    }

    let maxval = -1;
    let maxpos = -1;
    for (let i = d; i < trimmed.length; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }

    let T0 = maxpos;

    const x1 = c[T0 - 1];
    const x2 = c[T0];
    const x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) {
      T0 = T0 - b / (2 * a);
    }

    const pitch = sampleRate / T0;

    if (pitch < 50 || pitch > 2000) {
      return null;
    }

    return pitch;
  }, []);

  const calculateRMS = (buf: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      sum += buf[i] * buf[i];
    }
    return Math.sqrt(sum / buf.length);
  };

  const detectPitch = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current) return;

    const analyser = analyserRef.current;
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);

    const pitch = autoCorrelate(buf, audioContextRef.current.sampleRate);

    if (pitch !== null) {
      frequenciesRef.current.push(pitch);
    }

    const duration = (Date.now() - startTimeRef.current) / 1000;

    let avgFreq = null;
    let confidence = 0;

    if (frequenciesRef.current.length > 0) {
      const freqs = frequenciesRef.current;
      const sum = freqs.reduce((a, b) => a + b, 0);
      avgFreq = sum / freqs.length;

      const variance =
        freqs.reduce((sum, f) => sum + Math.pow(f - avgFreq!, 2), 0) / freqs.length;
      const stdDev = Math.sqrt(variance);
      confidence = Math.max(0, 100 - (stdDev / avgFreq!) * 100);
    }

    setState({
      isRecording: true,
      duration,
      detectedFrequency: avgFreq,
      confidence,
    });

    animationFrameRef.current = requestAnimationFrame(detectPitch);
  }, [autoCorrelate]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      mediaStreamRef.current = stream;
      sourceRef.current = source;
      analyserRef.current = analyser;
      startTimeRef.current = Date.now();
      frequenciesRef.current = [];

      setState({
        isRecording: true,
        duration: 0,
        detectedFrequency: null,
        confidence: 0,
      });

      detectPitch();

      return true;
    } catch (err) {
      console.error('录音启动失败:', err);
      return false;
    }
  }, [getAudioContext, detectPitch]);

  const stopRecording = useCallback((): number | null => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    let finalFrequency = null;
    let confidence = 0;

    if (frequenciesRef.current.length > 5) {
      const freqs = frequenciesRef.current.sort((a, b) => a - b);
      const trimmed = freqs.slice(Math.floor(freqs.length * 0.1), Math.ceil(freqs.length * 0.9));
      const sum = trimmed.reduce((a, b) => a + b, 0);
      finalFrequency = sum / trimmed.length;

      const variance =
        trimmed.reduce((s, f) => s + Math.pow(f - finalFrequency!, 2), 0) / trimmed.length;
      const stdDev = Math.sqrt(variance);
      confidence = Math.max(0, 100 - (stdDev / finalFrequency!) * 100);
    }

    setState({
      isRecording: false,
      duration: (Date.now() - startTimeRef.current) / 1000,
      detectedFrequency: finalFrequency,
      confidence,
    });

    frequenciesRef.current = [];

    return finalFrequency;
  }, []);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
  };
}
