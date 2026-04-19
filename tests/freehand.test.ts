import { describe, it, expect } from 'vitest';
import {
  seededRng, freehandUnderline, freehandArrow, freehandCheck,
  freehandX, freehandStrike, freehandBox, freehandHighlighter, freehandSquiggle,
} from '@/lib/freehand';

describe('seededRng', () => {
  it('produces identical sequences for identical seeds', () => {
    const a = seededRng(42);
    const b = seededRng(42);
    const seqA = Array.from({ length: 50 }, () => a());
    const seqB = Array.from({ length: 50 }, () => b());
    expect(seqA).toEqual(seqB);
  });
  it('differs across seeds', () => {
    const a = seededRng(1);
    const b = seededRng(2);
    expect(a()).not.toBe(b());
  });
});

describe('freehand primitives', () => {
  it('freehandCheck returns non-empty path', () => {
    expect(freehandCheck(22, 5).length).toBeGreaterThan(10);
  });
  it('freehandUnderline returns non-empty path', () => {
    expect(freehandUnderline(100, { seed: 1 }).length).toBeGreaterThan(10);
  });
  it('freehandArrow returns path', () => {
    expect(freehandArrow(0, 0, 50, 50, { seed: 7 }).length).toBeGreaterThan(10);
  });
  it('other primitives return non-empty', () => {
    expect(freehandX(22, 1).length).toBeGreaterThan(5);
    expect(freehandStrike(100, 1).length).toBeGreaterThan(5);
    expect(freehandBox(22, 1).length).toBeGreaterThan(5);
    expect(freehandHighlighter(100, 14, 1).length).toBeGreaterThan(5);
    expect(freehandSquiggle(100, 1).length).toBeGreaterThan(5);
  });
});
