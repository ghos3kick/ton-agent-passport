import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import MiniScore from '../MiniScore';

describe('MiniScore', () => {
  it('should render score value', () => {
    const { getByText } = render(<MiniScore score={65} level="verified" />);
    expect(getByText('65')).toBeTruthy();
    expect(getByText('Trust')).toBeTruthy();
  });

  it('should render 0 for none level', () => {
    const { getByText } = render(<MiniScore score={0} level="none" />);
    expect(getByText('0')).toBeTruthy();
  });

  it('should render 100 for elite', () => {
    const { getByText } = render(<MiniScore score={100} level="elite" />);
    expect(getByText('100')).toBeTruthy();
  });

  it('should contain SVG circle', () => {
    const { container } = render(<MiniScore score={50} level="trusted" />);
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.querySelectorAll('circle').length).toBeGreaterThanOrEqual(2);
  });
});
