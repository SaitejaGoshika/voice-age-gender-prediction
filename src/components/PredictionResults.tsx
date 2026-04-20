import { AnalysisResult } from "../utils/audioAnalysis";

interface PredictionResultsProps {
  result: AnalysisResult | null;
  isAnalyzing: boolean;
}

export default function PredictionResults({
  result,
  isAnalyzing,
}: PredictionResultsProps) {
  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-indigo-400 animate-pulse"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          </div>
        </div>
        <p className="mt-6 text-lg text-slate-300 font-medium">
          Analyzing voice patterns...
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Extracting features and running ML prediction
        </p>
        <div className="flex gap-1 mt-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const { features, gender, age } = result;

  const getGenderIcon = () => {
    if (gender.label === "Male") {
      return (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          <circle cx="18" cy="6" r="3" strokeWidth={1.5} />
          <path strokeWidth={1.5} d="M20.5 3.5L18 6" />
        </svg>
      );
    }
    return (
      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    );
  };

  const getAgeEmoji = () => {
    switch (age.label) {
      case "Child":
        return "👦";
      case "Teenager":
        return "🧑";
      case "Young Adult":
        return "👨";
      case "Adult":
        return "🧔";
      case "Middle-Aged Adult":
        return "👨‍🦰";
      case "Mature Adult":
        return "👨‍🦳";
      case "Senior":
        return "👴";
      case "Elderly":
        return "👴";
      default:
        return "👤";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Main Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gender Prediction */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-xl ${
                gender.label === "Male"
                  ? "bg-blue-500/10 text-blue-400"
                  : "bg-pink-500/10 text-pink-400"
              }`}
            >
              {getGenderIcon()}
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Predicted Gender
              </p>
              <p className="text-3xl font-bold text-white mt-1">
                {gender.label}
              </p>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Confidence</span>
                  <span>{(gender.confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-700/50">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      gender.label === "Male"
                        ? "bg-gradient-to-r from-blue-500 to-blue-400"
                        : "bg-gradient-to-r from-pink-500 to-pink-400"
                    }`}
                    style={{ width: `${gender.confidence * 100}%` }}
                  />
                </div>
              </div>
              {/* Gender probability bars */}
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-14">Male</span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-700/50">
                    <div
                      className="h-full rounded-full bg-blue-500/80 transition-all duration-1000"
                      style={{ width: `${gender.scores.male * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-12 text-right">
                    {(gender.scores.male * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-14">Female</span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-700/50">
                    <div
                      className="h-full rounded-full bg-pink-500/80 transition-all duration-1000"
                      style={{ width: `${gender.scores.female * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-12 text-right">
                    {(gender.scores.female * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Age Prediction */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 text-4xl">
              {getAgeEmoji()}
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Predicted Age Group
              </p>
              <p className="text-3xl font-bold text-white mt-1">
                {age.label}
              </p>
              <p className="text-sm text-slate-400 mt-0.5">
                Age range: {age.range} years
              </p>
              {age.estimatedAge > 0 && (
                <p className="text-sm text-slate-500 mt-0.5">
                  Estimated: ~{age.estimatedAge} years
                </p>
              )}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Confidence</span>
                  <span>{(age.confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-700/50">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-1000"
                    style={{ width: `${age.confidence * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audio Features */}
      <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 backdrop-blur-sm">
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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          Extracted Audio Features
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <FeatureCard
            label="Fundamental Freq (F0)"
            value={`${features.fundamentalFrequency.toFixed(1)} Hz`}
            color="indigo"
            description="Voice pitch"
          />
          <FeatureCard
            label="Pitch Confidence"
            value={`${(features.pitchConfidence * 100).toFixed(1)}%`}
            color="green"
            description="Detection quality"
          />
          <FeatureCard
            label="Spectral Centroid"
            value={`${features.spectralCentroid.toFixed(0)} Hz`}
            color="purple"
            description="Sound brightness"
          />
          <FeatureCard
            label="RMS Energy"
            value={features.rmsEnergy.toFixed(4)}
            color="red"
            description="Voice loudness"
          />
          <FeatureCard
            label="Zero Crossing Rate"
            value={features.zeroCrossingRate.toFixed(4)}
            color="cyan"
            description="Noisiness level"
          />
          <FeatureCard
            label="Spectral Rolloff"
            value={`${features.spectralRolloff.toFixed(0)} Hz`}
            color="amber"
            description="Energy threshold"
          />
          <FeatureCard
            label="Spectral Flatness"
            value={features.spectralFlatness.toFixed(4)}
            color="teal"
            description="Tone vs noise"
          />
          <FeatureCard
            label="Harmonic Ratio"
            value={`${(features.harmonicRatio * 100).toFixed(1)}%`}
            color="blue"
            description="Harmonicity"
          />
          <FeatureCard
            label="Formant F1"
            value={`${features.formantF1.toFixed(0)} Hz`}
            color="pink"
            description="Vocal tract resonance"
          />
          <FeatureCard
            label="Formant F2"
            value={`${features.formantF2.toFixed(0)} Hz`}
            color="rose"
            description="Vowel indicator"
          />
          <FeatureCard
            label="Pitch Stability"
            value={`${(features.pitchStability * 100).toFixed(1)}%`}
            color="emerald"
            description="Pitch consistency"
          />
          <FeatureCard
            label="Spectral Slope"
            value={features.spectralSlope.toFixed(4)}
            color="orange"
            description="Spectral tilt"
          />
        </div>
      </div>

      {/* Pitch Distribution */}
      {features.pitchSamples.length > 0 && (
        <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 backdrop-blur-sm">
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
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
              />
            </svg>
            Pitch Distribution Over Time
          </h3>
          <div className="h-32 flex items-end gap-px">
            {features.pitchSamples.slice(0, 100).map((pitch, i) => {
              const normalized = Math.min(pitch / 400, 1);
              const hue = 250 - normalized * 60;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm transition-all duration-300"
                  style={{
                    height: `${normalized * 100}%`,
                    backgroundColor: `hsla(${hue}, 80%, 60%, 0.6)`,
                    minHeight: "4px",
                    animationDelay: `${i * 10}ms`,
                  }}
                  title={`${pitch.toFixed(1)} Hz`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-2">
            <span>Start</span>
            <span>Pitch (Hz) →</span>
            <span>End</span>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="text-center text-xs text-slate-600 border-t border-slate-800 pt-4">
        <p>
          ⚠️ Predictions are based on acoustic feature analysis using heuristic ML models.
          Results are estimates and may not be accurate for all individuals.
        </p>
      </div>
    </div>
  );
}

function FeatureCard({
  label,
  value,
  color,
  description,
}: {
  label: string;
  value: string;
  color: string;
  description: string;
}) {
  const colorMap: Record<string, string> = {
    indigo: "from-indigo-500/10 to-indigo-500/5 border-indigo-500/20",
    green: "from-green-500/10 to-green-500/5 border-green-500/20",
    purple: "from-purple-500/10 to-purple-500/5 border-purple-500/20",
    red: "from-red-500/10 to-red-500/5 border-red-500/20",
    cyan: "from-cyan-500/10 to-cyan-500/5 border-cyan-500/20",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-500/20",
    teal: "from-teal-500/10 to-teal-500/5 border-teal-500/20",
    blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20",
    pink: "from-pink-500/10 to-pink-500/5 border-pink-500/20",
    rose: "from-rose-500/10 to-rose-500/5 border-rose-500/20",
    emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
    orange: "from-orange-500/10 to-orange-500/5 border-orange-500/20",
  };

  const textColorMap: Record<string, string> = {
    indigo: "text-indigo-400",
    green: "text-green-400",
    purple: "text-purple-400",
    red: "text-red-400",
    cyan: "text-cyan-400",
    amber: "text-amber-400",
    teal: "text-teal-400",
    blue: "text-blue-400",
    pink: "text-pink-400",
    rose: "text-rose-400",
    emerald: "text-emerald-400",
    orange: "text-orange-400",
  };

  return (
    <div
      className={`rounded-xl border bg-gradient-to-br p-3 ${colorMap[color] || colorMap.indigo}`}
    >
      <p className="text-xs text-slate-500 truncate" title={description}>
        {label}
      </p>
      <p
        className={`text-sm font-semibold mt-1 ${textColorMap[color] || textColorMap.indigo}`}
      >
        {value}
      </p>
    </div>
  );
}
