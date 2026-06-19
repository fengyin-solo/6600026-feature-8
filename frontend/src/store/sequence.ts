import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Sequence, AlignmentResult, GCContent, PhyloNode } from '../types';
import {
  needlemanWunsch,
  smithWaterman,
  calculateGCContent,
  calculateDistanceMatrix,
  buildNJTree,
  MOCK_SEQUENCES
} from '../utils/alignment';

export const useSequenceStore = defineStore('sequence', () => {
  const sequences = ref<Sequence[]>([]);
  const alignmentResult = ref<AlignmentResult | null>(null);
  const currentAlgorithm = ref<'nw' | 'sw'>('nw');
  const gcData = ref<GCContent[]>([]);
  const phyloTree = ref<PhyloNode | null>(null);
  const selectedSeq1 = ref<string>('');
  const selectedSeq2 = ref<string>('');
  const alignmentSeq1Id = ref<string>('');
  const alignmentSeq2Id = ref<string>('');
  const gcAnalyzedSeqId = ref<string>('');

  const alignmentIdentity = computed(() => {
    return alignmentResult.value ? alignmentResult.value.identity : 0;
  });

  const alignmentScore = computed(() => {
    return alignmentResult.value ? alignmentResult.value.score : 0;
  });

  function addSequence(id: string, name: string, data: string) {
    sequences.value.push({
      id,
      name,
      data: data.toUpperCase().replace(/[^ACGT]/g, ''),
      length: data.length
    });
  }

  function isAlignmentAffected(id: string) {
    return !!alignmentResult.value && (alignmentSeq1Id.value === id || alignmentSeq2Id.value === id);
  }

  function isGcAffected(id: string) {
    return gcData.value.length > 0 && gcAnalyzedSeqId.value === id;
  }

  function isTreeAffected() {
    return !!phyloTree.value;
  }

  function getDeletionImpacts(id: string) {
    const impacts: string[] = [];
    const seq = sequences.value.find(s => s.id === id);
    if (!seq) return impacts;

    if (isAlignmentAffected(id)) {
      impacts.push('已有的序列比对结果');
    }
    if (isGcAffected(id)) {
      impacts.push('GC含量分析结果');
    }
    if (isTreeAffected()) {
      impacts.push('系统发育树结果（基于全部序列，删除任一序列将失效）');
    }
    return impacts;
  }

  function removeSequence(id: string) {
    const seq = sequences.value.find(s => s.id === id);
    if (!seq) return;

    sequences.value = sequences.value.filter(s => s.id !== id);

    if (selectedSeq1.value === id) selectedSeq1.value = '';
    if (selectedSeq2.value === id) selectedSeq2.value = '';

    if (isAlignmentAffected(id)) {
      alignmentResult.value = null;
      alignmentSeq1Id.value = '';
      alignmentSeq2Id.value = '';
    }
    if (isGcAffected(id)) {
      gcData.value = [];
      gcAnalyzedSeqId.value = '';
    }
    if (isTreeAffected()) {
      phyloTree.value = null;
    }
  }

  function runAlignment(seq1Id: string, seq2Id: string, algorithm: 'nw' | 'sw') {
    const s1 = sequences.value.find(s => s.id === seq1Id);
    const s2 = sequences.value.find(s => s.id === seq2Id);

    if (!s1 || !s2) return;

    currentAlgorithm.value = algorithm;

    if (algorithm === 'nw') {
      alignmentResult.value = needlemanWunsch(s1.data, s2.data);
    } else {
      alignmentResult.value = smithWaterman(s1.data, s2.data);
    }

    alignmentSeq1Id.value = seq1Id;
    alignmentSeq2Id.value = seq2Id;
  }

  function loadMockSequences() {
    sequences.value = [];
    for (const mock of MOCK_SEQUENCES) {
      addSequence(mock.id, mock.name, mock.data);
    }
    selectedSeq1.value = MOCK_SEQUENCES[0].id;
    selectedSeq2.value = MOCK_SEQUENCES[1].id;
  }

  function buildTree() {
    if (sequences.value.length < 2) return;

    const seqData = sequences.value.map(s => ({ name: s.name, data: s.data }));
    const distMatrix = calculateDistanceMatrix(seqData);
    const names = sequences.value.map(s => s.name);
    phyloTree.value = buildNJTree(distMatrix, names);
  }

  function analyzeGC(seqId: string, windowSize: number) {
    const seq = sequences.value.find(s => s.id === seqId);
    if (!seq) return;
    gcData.value = calculateGCContent(seq.data, windowSize);
    gcAnalyzedSeqId.value = seqId;
  }

  return {
    sequences,
    alignmentResult,
    currentAlgorithm,
    gcData,
    phyloTree,
    selectedSeq1,
    selectedSeq2,
    alignmentIdentity,
    alignmentScore,
    addSequence,
    removeSequence,
    getDeletionImpacts,
    runAlignment,
    loadMockSequences,
    buildTree,
    analyzeGC
  };
});
