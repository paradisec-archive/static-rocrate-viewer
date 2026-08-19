import { describe, expect, it } from 'vitest';
import { formatDuration, formatFileSize } from './formatters.ts';

describe('formatFileSize', () => {
  it('renders zero without a decimal', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });

  it('renders bytes as whole numbers and larger units to one decimal', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(4_567_890)).toBe('4.4 MB');
  });
});

describe('formatDuration', () => {
  it('pads seconds and truncates fractions', () => {
    expect(formatDuration(9)).toBe('0:09');
    expect(formatDuration(1089.68)).toBe('18:09');
  });
});
