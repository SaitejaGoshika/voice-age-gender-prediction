import { useState, useRef, useCallback, useEffect } from "react";
import WaveformVisualizer from "./components/WaveformVisualizer";
import PredictionResults from "./components/PredictionResults";
import { performFullAnalysis, AnalysisResult } from "./utils/audioAnalysis";

type VisualizationType = "waveform" | "frequency" | "circular";

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [_hasRecording, setHasRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [vizType, setVizType] = useState<VisualizationType>("waveform");
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const levelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (levelIntervalRef.current) {
      clearInterval(levelIntervalRef.current);
      levelIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (
      audioContextRef.current &&
      audioContextRef.current.state !== "closed"
    ) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setResult(null);
      setHasRecording(false);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 44100 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      // Timer for recording duration
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Audio level monitoring
      const dataArray = new Float32Array(analyser.fftSize);
      levelIntervalRef.current = setInterval(() => {
        if (analyserRef.current) {
          analyserRef.current.getFloatTimeDomainData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);
          setAudioLevel(Math.min(rms * 5, 1));
        }
      }, 50);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError(
        "Could not access microphone. Please ensure you have granted microphone permissions and try again."
      );
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || !audioContextRef.current) return;

    const mediaRecorder = mediaRecorderRef.current;
    const audioContext = audioContextRef.current;

    return new Promise<void>((resolve) => {
      mediaRecorder.onstop = async () => {
        const chunks = chunksRef.current;
        if (chunks.length === 0) {
          cleanup();
          setIsRecording(false);
          resolve();
          return;
        }

        const blob = new Blob(chunks, { type: "audio/webm" });

        try {
          const arrayBuffer = await blob.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

          cleanup();
          setIsRecording(false);
          setHasRecording(true);
          setAudioLevel(0);

          // Perform analysis
          setIsAnalyzing(true);

          // Small delay for visual feedback
          await new Promise((r) => setTimeout(r, 1500));

          const analysisResult = await performFullAnalysis(audioBuffer);
          setResult(analysisResult);
          setIsAnalyzing(false);

        } catch (err) {
          console.error("Error analyzing audio:", err);
          setError("Error analyzing audio. Please try recording again.");
          cleanup();
          setIsRecording(false);
          setIsAnalyzing(false);
        }

        resolve();
      };

      mediaRecorder.stop();
    });
  }, [cleanup]);

  const resetRecording = useCallback(() => {
    setResult(null);
    setHasRecording(false);
    setRecordingTime(0);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            ML-Powered Voice Analysis
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent">
            VoiceAI
          </h1>
          <p className="mt-3 text-slate-400 text-lg max-w-xl mx-auto">
            Record your voice and our ML model will analyze acoustic features to
            predict gender and estimate age
          </p>
        </header>

        {/* Main Content Card */}
        <div className="rounded-3xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Visualization Tabs */}
          <div className="flex items-center gap-1 p-3 border-b border-slate-700/50 bg-slate-900/30">
            <span className="text-xs text-slate-500 mr-2 ml-1">View:</span>
            {(
              [
                { id: "waveform", label: "Waveform", icon: "〰️" },
                { id: "frequency", label: "Spectrum", icon: "📊" },
                { id: "circular", label: "Circular", icon: "🔵" },
              ] as const
            ).map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setVizType(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  vizType === id
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-700/30 border border-transparent"
                }`}
              >
                <span className="mr-1">{icon}</span>
                {label}
              </button>
            ))}
            <div className="flex-1" />
            {isRecording && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-red-400 font-mono">
                  {formatTime(recordingTime)}
                </span>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              </div>
            )}
          </div>

          {/* Visualization Area */}
          <div className="p-4 sm:p-6">
            <WaveformVisualizer
              analyserNode={analyserRef.current}
              isActive={isRecording}
              type={vizType}
            />
          </div>

          {/* Audio Level Meter */}
          {isRecording && (
            <div className="px-6 pb-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">Level</span>
                <div className="flex-1 h-2 rounded-full bg-slate-700/50 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-75"
                    style={{
                      width: `${audioLevel * 100}%`,
                      background: `linear-gradient(90deg, #22c55e 0%, #eab308 50%, #ef4444 100%)`,
                    }}
                  />
                </div>
                <div className="flex gap-0.5">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-3 rounded-sm transition-all duration-75 ${
                        i < audioLevel * 10
                          ? i < 5
                            ? "bg-green-500"
                            : i < 8
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          : "bg-slate-700"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="p-4 sm:p-6 pt-2 border-t border-slate-700/50">
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                <svg
                  className="w-5 h-5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {error}
              </div>
            )}

            <div className="flex items-center justify-center gap-4">
              {!isRecording && !isAnalyzing && !result && (
                <button
                  onClick={startRecording}
                  className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-lg transition-all duration-300 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95"
                >
                  <span className="flex items-center gap-3">
                    <span className="relative">
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        />
                      </svg>
                    </span>
                    Start Recording
                  </span>
                  <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}

              {isRecording && (
                <>
                  <button
                    onClick={() => stopRecording()}
                    className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-lg transition-all duration-300 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-105 active:scale-95"
                  >
                    <span className="flex items-center gap-3">
                      <svg
                        className="w-6 h-6"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                      Stop & Analyze
                    </span>
                  </button>
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    Speak naturally for 3-10 seconds for best results
                  </p>
                </>
              )}

              {result && !isRecording && !isAnalyzing && (
                <div className="flex gap-3">
                  <button
                    onClick={resetRecording}
                    className="px-6 py-3 rounded-xl bg-slate-700/50 hover:bg-slate-700/70 text-slate-300 font-medium transition-all border border-slate-600/50 hover:border-slate-500/50"
                  >
                    <span className="flex items-center gap-2">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Record Again
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Tips */}
            {!isRecording && !result && !isAnalyzing && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <TipCard
                  icon="🎤"
                  title="Clear Voice"
                  description="Speak clearly in a quiet environment"
                />
                <TipCard
                  icon="⏱️"
                  title="3-10 Seconds"
                  description="Record for at least 3 seconds"
                />
                <TipCard
                  icon="🗣️"
                  title="Natural Speech"
                  description="Use your normal speaking voice"
                />
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="mt-6">
          <PredictionResults result={result} isAnalyzing={isAnalyzing} />
        </div>

        {/* How it Works Section */}
        {!result && !isAnalyzing && !isRecording && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-white text-center mb-8">
              How It Works
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StepCard
                step={1}
                title="Record Voice"
                description="Capture audio using your device's microphone"
                icon="🎙️"
              />
              <StepCard
                step={2}
                title="Extract Features"
                description="Analyze pitch, formants, spectral features & more"
                icon="📊"
              />
              <StepCard
                step={3}
                title="ML Prediction"
                description="Weighted model predicts gender from 12+ features"
                icon="🤖"
              />
              <StepCard
                step={4}
                title="Age Estimation"
                description="Voice aging markers estimate age group"
                icon="🎯"
              />
            </div>

            {/* Technical Details */}
            <div className="mt-8 rounded-2xl border border-slate-700/50 bg-slate-800/20 backdrop-blur-sm p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-indigo-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                Technical Approach
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-400">
                <div className="space-y-2">
                  <h4 className="text-slate-300 font-medium">
                    Audio Feature Extraction
                  </h4>
                  <ul className="space-y-1.5 ml-4">
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-0.5">•</span>
                      Autocorrelation-based pitch detection (F0)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-0.5">•</span>
                      Spectral centroid, rolloff, and flatness
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-0.5">•</span>
                      Formant frequency estimation (F1, F2)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400 mt-0.5">•</span>
                      Zero-crossing rate and RMS energy
                    </li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="text-slate-300 font-medium">
                    Prediction Model
                  </h4>
                  <ul className="space-y-1.5 ml-4">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">•</span>
                      Weighted multi-feature scoring (inspired by SVM)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">•</span>
                      Gender classification: F0, formants, spectral features
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">•</span>
                      Age estimation: pitch stability, spectral slope, energy
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">•</span>
                      Confidence scoring with calibration
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-slate-600">
          <p>
            Built with React, Web Audio API & ML Heuristics
          </p>
        </footer>
      </div>
    </div>
  );
}

function TipCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700/30 bg-slate-800/20 p-3 text-center">
      <span className="text-2xl">{icon}</span>
      <p className="text-sm font-medium text-slate-300 mt-1">{title}</p>
      <p className="text-xs text-slate-500 mt-0.5">{description}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
  icon,
}: {
  step: number;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/20 p-5 text-center hover:bg-slate-800/30 transition-colors">
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="text-3xl">{icon}</span>
      </div>
      <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold mb-2">
        {step}
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </div>
  );
}
