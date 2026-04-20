// Audio Feature Extraction Utilities
// Implements pitch detection via autocorrelation, spectral analysis, and feature extraction

export interface AudioFeatures {
  fundamentalFrequency: number; // F0 in Hz
  pitchConfidence: number; // 0-1 confidence in pitch detection
  spectralCentroid: number; // Brightness of sound
  rmsEnergy: number; // Volume/loudness
  zeroCrossingRate: number; // Noisiness indicator
  spectralRolloff: number; // Frequency below which most energy exists
  spectralFlatness: number; // Tonal vs noisy
  harmonicRatio: number; // Harmonicity
  formantF1: number; // First formant estimate
  formantF2: number; // Second formant estimate
  pitchStability: number; // Consistency of pitch over time
  spectralSlope: number; // Tilt of spectrum (age indicator)
  mfccLike: number[]; // Simplified MFCC-like features
  pitchSamples: number[]; // All pitch measurements over time
}

export interface AnalysisResult {
  features: AudioFeatures;
  gender: {
    label: string;
    confidence: number;
    scores: { male: number; female: number };
  };
  age: {
    label: string;
    range: string;
    confidence: number;
    estimatedAge: number;
  };
}

// Autocorrelation-based pitch detection
function autoCorrelate(
  buffer: Float32Array,
  sampleRate: number
): { frequency: number; confidence: number } {
  const SIZE = buffer.length;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) {
    rms += buffer[i] * buffer[i];
  }
  rms = Math.sqrt(rms / SIZE);

  if (rms < 0.01) return { frequency: -1, confidence: 0 };

  // Trim silence from edges
  let r1 = 0,
    r2 = SIZE - 1;
  const threshold = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < threshold) {
      r1 = i;
    } else break;
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < threshold) {
      r2 = SIZE - i;
    } else break;
  }

  const trimmedBuffer = buffer.slice(r1, r2);
  const trimmedSize = trimmedBuffer.length;

  if (trimmedSize < 2) return { frequency: -1, confidence: 0 };

  // Autocorrelation
  const correlations = new Float32Array(trimmedSize);
  for (let i = 0; i < trimmedSize; i++) {
    for (let j = 0; j < trimmedSize - i; j++) {
      correlations[i] += trimmedBuffer[j] * trimmedBuffer[j + i];
    }
  }

  // Find the first dip then the peak after it
  let d = 0;
  while (d < trimmedSize / 2 && correlations[d] > correlations[d + 1]) {
    d++;
  }

  let maxVal = -1;
  let maxPos = -1;
  for (let i = d; i < trimmedSize / 2; i++) {
    if (correlations[i] > maxVal) {
      maxVal = correlations[i];
      maxPos = i;
    }
  }

  if (maxPos === -1 || maxVal <= 0) return { frequency: -1, confidence: 0 };

  const confidence = maxVal / correlations[0];

  // Parabolic interpolation for better precision
  let betterPos = maxPos;
  if (maxPos > 0 && maxPos < trimmedSize / 2 - 1) {
    const alpha = correlations[maxPos - 1];
    const beta = correlations[maxPos];
    const gamma = correlations[maxPos + 1];
    const p = (0.5 * (alpha - gamma)) / (alpha - 2 * beta + gamma);
    betterPos = maxPos + p;
  }

  const frequency = sampleRate / betterPos;
  return { frequency, confidence };
}

// Calculate spectral centroid
function spectralCentroid(fftData: Uint8Array, sampleRate: number): number {
  let weightedSum = 0;
  let magnitudeSum = 0;
  const binCount = fftData.length;

  for (let i = 0; i < binCount; i++) {
    const magnitude = fftData[i];
    weightedSum += i * magnitude;
    magnitudeSum += magnitude;
  }

  if (magnitudeSum === 0) return 0;
  const centroidBin = weightedSum / magnitudeSum;
  return (centroidBin / binCount) * (sampleRate / 2);
}

// Calculate spectral rolloff (frequency below which 85% of energy)
function spectralRolloff(fftData: Uint8Array, sampleRate: number): number {
  let totalEnergy = 0;
  const binCount = fftData.length;

  for (let i = 0; i < binCount; i++) {
    totalEnergy += fftData[i] * fftData[i];
  }

  let cumulativeEnergy = 0;
  const threshold = 0.85 * totalEnergy;

  for (let i = 0; i < binCount; i++) {
    cumulativeEnergy += fftData[i] * fftData[i];
    if (cumulativeEnergy >= threshold) {
      return (i / binCount) * (sampleRate / 2);
    }
  }
  return sampleRate / 2;
}

// Calculate spectral flatness
function spectralFlatness(fftData: Uint8Array): number {
  let logSum = 0;
  let linearSum = 0;
  let count = 0;

  for (let i = 0; i < fftData.length; i++) {
    const val = Math.max(fftData[i], 1);
    logSum += Math.log(val);
    linearSum += val;
    count++;
  }

  if (linearSum === 0 || count === 0) return 0;
  const geometricMean = Math.exp(logSum / count);
  const arithmeticMean = linearSum / count;

  return geometricMean / arithmeticMean;
}

// Calculate zero crossing rate
function zeroCrossingRate(buffer: Float32Array): number {
  let crossings = 0;
  for (let i = 1; i < buffer.length; i++) {
    if (
      (buffer[i] >= 0 && buffer[i - 1] < 0) ||
      (buffer[i] < 0 && buffer[i - 1] >= 0)
    ) {
      crossings++;
    }
  }
  return crossings / buffer.length;
}

// Estimate spectral slope (tilt)
function spectralSlope(fftData: Uint8Array): number {
  const n = fftData.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = fftData[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0;

  return (n * sumXY - sumX * sumY) / denominator;
}

// Calculate simplified MFCC-like features
function simplifiedMFCC(fftData: Uint8Array, numCoeffs: number = 8): number[] {
  const coeffs: number[] = [];
  const n = fftData.length;

  // Use DCT-like approximation on log magnitudes
  const logMagnitudes = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    logMagnitudes[i] = Math.log(Math.max(fftData[i], 1));
  }

  for (let k = 0; k < numCoeffs; k++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum +=
        logMagnitudes[i] * Math.cos((Math.PI * k * (i + 0.5)) / n);
    }
    coeffs.push(sum / n);
  }

  return coeffs;
}

// Estimate formants using peak picking in spectrum
function estimateFormants(
  fftData: Uint8Array,
  sampleRate: number
): { f1: number; f2: number } {
  const binCount = fftData.length;
  const nyquist = sampleRate / 2;
  const peaks: { freq: number; magnitude: number }[] = [];

  // Only look in relevant frequency range (100Hz - 5000Hz)
  const minBin = Math.floor((100 / nyquist) * binCount);
  const maxBin = Math.floor((5000 / nyquist) * binCount);

  for (let i = minBin + 1; i < maxBin - 1; i++) {
    if (
      fftData[i] > fftData[i - 1] &&
      fftData[i] > fftData[i + 1] &&
      fftData[i] > 30
    ) {
      const freq = (i / binCount) * nyquist;
      peaks.push({ freq, magnitude: fftData[i] });
    }
  }

  // Sort by magnitude
  peaks.sort((a, b) => b.magnitude - a.magnitude);

  const f1 = peaks.length > 0 ? peaks[0].freq : 500;
  const f2 = peaks.length > 1 ? peaks[1].freq : 1500;

  return { f1, f2 };
}

// Main analysis function - processes audio buffer
export function analyzeAudioBuffer(
  audioBuffer: AudioBuffer
): AudioFeatures {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const bufferSize = 2048;
  const pitchSamples: number[] = [];
  const pitchConfidences: number[] = [];

  // Analyze pitch over multiple windows
  for (let offset = 0; offset < channelData.length - bufferSize; offset += bufferSize / 2) {
    const chunk = channelData.slice(offset, offset + bufferSize);
    const { frequency, confidence } = autoCorrelate(chunk, sampleRate);
    if (frequency > 50 && frequency < 600 && confidence > 0.1) {
      pitchSamples.push(frequency);
      pitchConfidences.push(confidence);
    }
  }

  // Calculate average fundamental frequency
  const validPitches = pitchSamples.filter((p) => p > 0);
  const fundamentalFrequency =
    validPitches.length > 0
      ? validPitches.reduce((a, b) => a + b, 0) / validPitches.length
      : 0;

  const pitchConfidence =
    pitchConfidences.length > 0
      ? pitchConfidences.reduce((a, b) => a + b, 0) / pitchConfidences.length
      : 0;

  // Calculate pitch stability (inverse of coefficient of variation)
  let pitchStability = 0;
  if (validPitches.length > 1) {
    const mean = fundamentalFrequency;
    const variance =
      validPitches.reduce((sum, p) => sum + (p - mean) ** 2, 0) /
      validPitches.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean;
    pitchStability = Math.max(0, 1 - cv);
  }

  // FFT analysis using OfflineAudioContext
  const offlineCtx = new OfflineAudioContext(1, channelData.length, sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;

  const analyser = offlineCtx.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  analyser.connect(offlineCtx.destination);
  source.start(0);

  // For synchronous analysis, we'll compute features from raw audio data
  // RMS Energy
  let rmsSum = 0;
  for (let i = 0; i < channelData.length; i++) {
    rmsSum += channelData[i] * channelData[i];
  }
  const rmsEnergy = Math.sqrt(rmsSum / channelData.length);

  // Zero crossing rate
  const zcr = zeroCrossingRate(channelData);

  // Create a simple FFT approximation using frequency domain analysis
  // We'll use the autocorrelation results and time-domain features

  // Compute a simplified spectrum using DFT on a representative window
  const windowSize = Math.min(1024, channelData.length);
  const windowData = channelData.slice(0, windowSize);
  const spectrum = new Float32Array(windowSize / 2);

  for (let k = 0; k < windowSize / 2; k++) {
    let real = 0,
      imag = 0;
    for (let n = 0; n < windowSize; n++) {
      const angle = (2 * Math.PI * k * n) / windowSize;
      real += windowData[n] * Math.cos(angle);
      imag -= windowData[n] * Math.sin(angle);
    }
    spectrum[k] = Math.sqrt(real * real + imag * imag);
  }

  // Convert spectrum to Uint8Array-like format for helper functions
  const maxSpecVal = Math.max(...Array.from(spectrum));
  const spectrumUint8 = new Uint8Array(spectrum.length);
  for (let i = 0; i < spectrum.length; i++) {
    spectrumUint8[i] = Math.round((spectrum[i] / maxSpecVal) * 255);
  }

  const centroid = spectralCentroid(spectrumUint8, sampleRate);
  const rolloff = spectralRolloff(spectrumUint8, sampleRate);
  const flatness = spectralFlatness(spectrumUint8);
  const slope = spectralSlope(spectrumUint8);
  const mfccLike = simplifiedMFCC(spectrumUint8, 8);
  const { f1, f2 } = estimateFormants(spectrumUint8, sampleRate);

  // Harmonic ratio estimation
  let harmonicRatio = 0;
  if (fundamentalFrequency > 0) {
    const fundamentalBin = Math.round(
      (fundamentalFrequency / (sampleRate / 2)) * (windowSize / 2)
    );
    let harmonicEnergy = 0;
    let totalEnergy = 0;

    for (let i = 0; i < spectrum.length; i++) {
      totalEnergy += spectrum[i];
      for (let h = 1; h <= 5; h++) {
        const hBin = fundamentalBin * h;
        if (hBin < spectrum.length) {
          const range = 3;
          for (
            let j = Math.max(0, hBin - range);
            j <= Math.min(spectrum.length - 1, hBin + range);
            j++
          ) {
            harmonicEnergy += spectrum[j] / (2 * range + 1);
          }
        }
      }
    }

    harmonicRatio = totalEnergy > 0 ? Math.min(harmonicEnergy / totalEnergy, 1) : 0;
  }

  return {
    fundamentalFrequency,
    pitchConfidence,
    spectralCentroid: centroid,
    rmsEnergy,
    zeroCrossingRate: zcr,
    spectralRolloff: rolloff,
    spectralFlatness: flatness,
    harmonicRatio,
    formantF1: f1,
    formantF2: f2,
    pitchStability,
    spectralSlope: slope,
    mfccLike,
    pitchSamples: validPitches,
  };
}

// Predict gender based on audio features using ML-inspired model
export function predictGender(features: AudioFeatures): {
  label: string;
  confidence: number;
  scores: { male: number; female: number };
} {
  const f0 = features.fundamentalFrequency;
  const confidence = features.pitchConfidence;

  if (f0 <= 0 || confidence < 0.05) {
    return {
      label: "Unknown",
      confidence: 0,
      scores: { male: 0.5, female: 0.5 },
    };
  }

  // Weighted scoring model inspired by voice science research
  // Feature weights determined by their importance in gender classification

  let maleScore = 0;
  let femaleScore = 0;

  // 1. Fundamental Frequency (highest weight - ~60% importance)
  // Male: 85-180 Hz, Female: 165-255 Hz
  const f0Weight = 0.45;
  if (f0 < 120) {
    maleScore += f0Weight * 1.0;
    femaleScore += f0Weight * 0.05;
  } else if (f0 < 150) {
    maleScore += f0Weight * 0.8;
    femaleScore += f0Weight * 0.15;
  } else if (f0 < 170) {
    maleScore += f0Weight * 0.55;
    femaleScore += f0Weight * 0.35;
  } else if (f0 < 185) {
    maleScore += f0Weight * 0.35;
    femaleScore += f0Weight * 0.55;
  } else if (f0 < 210) {
    maleScore += f0Weight * 0.15;
    femaleScore += f0Weight * 0.8;
  } else if (f0 < 250) {
    maleScore += f0Weight * 0.05;
    femaleScore += f0Weight * 0.95;
  } else {
    maleScore += f0Weight * 0.02;
    femaleScore += f0Weight * 0.98;
  }

  // 2. Formant frequencies (~20% importance)
  const formantWeight = 0.20;
  const avgFormant = (features.formantF1 + features.formantF2) / 2;
  if (avgFormant < 1200) {
    maleScore += formantWeight * 0.8;
    femaleScore += formantWeight * 0.2;
  } else if (avgFormant < 1600) {
    maleScore += formantWeight * 0.5;
    femaleScore += formantWeight * 0.5;
  } else {
    maleScore += formantWeight * 0.2;
    femaleScore += formantWeight * 0.8;
  }

  // 3. Spectral centroid (~15% importance)
  const centroidWeight = 0.15;
  if (features.spectralCentroid < 1500) {
    maleScore += centroidWeight * 0.8;
    femaleScore += centroidWeight * 0.2;
  } else if (features.spectralCentroid < 2500) {
    maleScore += centroidWeight * 0.4;
    femaleScore += centroidWeight * 0.6;
  } else {
    maleScore += centroidWeight * 0.2;
    femaleScore += centroidWeight * 0.8;
  }

  // 4. Spectral slope (~10% importance)
  const slopeWeight = 0.10;
  if (features.spectralSlope < -0.5) {
    maleScore += slopeWeight * 0.7;
    femaleScore += slopeWeight * 0.3;
  } else {
    maleScore += slopeWeight * 0.3;
    femaleScore += slopeWeight * 0.7;
  }

  // 5. Harmonic ratio (~10% importance)
  const harmonicWeight = 0.10;
  if (features.harmonicRatio > 0.5) {
    maleScore += harmonicWeight * 0.6;
    femaleScore += harmonicWeight * 0.4;
  } else {
    maleScore += harmonicWeight * 0.4;
    femaleScore += harmonicWeight * 0.6;
  }

  // Normalize scores
  const total = maleScore + femaleScore;
  const normalizedMale = maleScore / total;
  const normalizedFemale = femaleScore / total;

  const isMale = normalizedMale > normalizedFemale;
  const label = isMale ? "Male" : "Female";
  const predictionConfidence = Math.max(normalizedMale, normalizedFemale) * Math.min(confidence * 2, 1);

  return {
    label,
    confidence: Math.min(predictionConfidence, 0.99),
    scores: { male: normalizedMale, female: normalizedFemale },
  };
}

// Predict age range based on audio features
export function predictAge(features: AudioFeatures): {
  label: string;
  range: string;
  confidence: number;
  estimatedAge: number;
} {
  const f0 = features.fundamentalFrequency;
  const stability = features.pitchStability;
  const centroid = features.spectralCentroid;
  const slope = features.spectralSlope;
  const energy = features.rmsEnergy;

  if (f0 <= 0 || features.pitchConfidence < 0.05) {
    return {
      label: "Unknown",
      range: "N/A",
      confidence: 0,
      estimatedAge: 0,
    };
  }

  // Age estimation model based on multiple voice aging indicators
  let ageScore = 30; // Start at middle

  // 1. Pitch stability tends to decrease with age after 50
  if (stability > 0.85) {
    ageScore -= 5; // Younger voices tend to be more stable
  } else if (stability < 0.6) {
    ageScore += 8; // Older voices have more jitter
  }

  // 2. Spectral centroid tends to shift with age
  if (centroid > 3000) {
    ageScore -= 8; // Brighter voice = younger
  } else if (centroid > 2000) {
    ageScore -= 3;
  } else if (centroid < 1200) {
    ageScore += 8; // Darker voice = older
  } else {
    ageScore += 3;
  }

  // 3. Spectral slope changes with age
  if (slope < -1) {
    ageScore += 5; // Steeper rolloff = older
  } else if (slope > -0.2) {
    ageScore -= 5; // Gentler rolloff = younger
  }

  // 4. Energy patterns
  if (energy > 0.1) {
    ageScore -= 2; // Stronger voice projection = younger
  } else if (energy < 0.03) {
    ageScore += 3;
  }

  // 5. F0 variance affects age estimate
  // Children have very high F0, elderly may have lower or more variable
  if (f0 > 300) {
    ageScore -= 20; // Very high pitch suggests child/teen
  } else if (f0 > 250) {
    ageScore -= 10;
  }

  // 6. Harmonic structure
  if (features.harmonicRatio > 0.4) {
    ageScore -= 3; // Clearer harmonics in younger voices
  }

  // Clamp age estimate
  const estimatedAge = Math.max(8, Math.min(80, Math.round(ageScore)));

  // Determine age range
  let label: string;
  let range: string;

  if (estimatedAge < 13) {
    label = "Child";
    range = "8-12";
  } else if (estimatedAge < 18) {
    label = "Teenager";
    range = "13-17";
  } else if (estimatedAge < 25) {
    label = "Young Adult";
    range = "18-24";
  } else if (estimatedAge < 35) {
    label = "Adult";
    range = "25-34";
  } else if (estimatedAge < 45) {
    label = "Middle-Aged Adult";
    range = "35-44";
  } else if (estimatedAge < 55) {
    label = "Mature Adult";
    range = "45-54";
  } else if (estimatedAge < 65) {
    label = "Senior";
    range = "55-64";
  } else {
    label = "Elderly";
    range = "65+";
  }

  // Confidence based on pitch confidence and stability
  const confidence = Math.min(
    (features.pitchConfidence * 0.5 + stability * 0.3 + 0.2),
    0.95
  );

  return {
    label,
    range,
    confidence,
    estimatedAge,
  };
}

// Full analysis pipeline - now ML-powered
import { performMLAnalysis, MLResult } from './mlModel';

export async function performFullAnalysis(audioBuffer: AudioBuffer): Promise<AnalysisResult> {
  // Hybrid: keep acoustic features + add ML
  const features = analyzeAudioBuffer(audioBuffer);
  
  try {
    const mlResult = await performMLAnalysis(audioBuffer);
    
    // Merge ML predictions with acoustic
    const gender = {
      ...mlResult.gender,
      scores: mlResult.gender.scores
    };
    
    const age = {
      ...mlResult.age,
      estimatedAge: mlResult.age.estimatedAge
    };
    
    return {
      features,
      gender,
      age,
      mlModelUsed: mlResult.model,
      embeddingDim: mlResult.embeddingLength
    };
  } catch (error) {
    console.warn('ML inference failed, falling back to heuristics:', error);
    // Fallback to original heuristics
    const gender = predictGender(features);
    const age = predictAge(features);
    return { features, gender, age };
  }
}

// Extend interface for ML results
export interface AnalysisResult {
  features: AudioFeatures;
  gender: {
    label: string;
    confidence: number;
    scores: { male: number; female: number };
  };
  age: {
    label: string;
    range: string;
    confidence: number;
    estimatedAge: number;
  };
  mlModelUsed?: string;
  embeddingDim?: number;
}

