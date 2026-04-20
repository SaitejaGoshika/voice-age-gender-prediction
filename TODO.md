# Voice Age/Gender Prediction: ML Upgrade TODO

## Status: 0/9 ✅ Pending

### Phase 1: Setup (3/3)
- [✅] 1. Add @xenova/transformers dependency via edit package.json
- [✅] 2. Run `npm install`
- [✅] 3. Create sample-data.json with Common Voice demo predictions



### Phase 2: Core ML (0/4)
- [ ] 4. Refactor src/utils/audioAnalysis.ts: Load HF model (speechbrain/spkrec-ecapa-voxceleb)
- [ ] 5. Implement audio → embedding → gender/age classifier
- [ ] 6. Update AnalysisResult interface for real ML outputs
- [ ] 7. Test inference pipeline

### Phase 3: UI Integration (0/2)
- [ ] 8. Update App.tsx/PredictionResults.tsx for new outputs
- [ ] 9. Final test + completion (`npm run dev`)

**Next: npm install after deps → verify → proceed to model code.**

