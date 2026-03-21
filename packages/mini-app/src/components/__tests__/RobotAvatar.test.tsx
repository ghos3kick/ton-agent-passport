import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import RobotAvatar from '../RobotAvatar';

describe('RobotAvatar', () => {
  it('should render SVG', () => {
    const { container } = render(<RobotAvatar address="EQDRdykyEDAj9GgM3sPnkj9Y-OM6IG3wX_QmI40emh2HBxZS" />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('should be deterministic — same address = same output', () => {
    const addr = 'EQDRdykyEDAj9GgM3sPnkj9Y-OM6IG3wX_QmI40emh2HBxZS';
    const { container: c1 } = render(<RobotAvatar address={addr} />);
    const { container: c2 } = render(<RobotAvatar address={addr} />);
    expect(c1.innerHTML).toBe(c2.innerHTML);
  });

  it('should produce different output for different addresses', () => {
    const { container: c1 } = render(<RobotAvatar address="EQDRdykyEDAj9GgM3sPnkj9Y-OM6IG3wX_QmI40emh2HBxZS" />);
    const { container: c2 } = render(<RobotAvatar address="EQBynBO23ywHy_CgarY9NK9FTz0yDsG82PtcbSTQgGoXwiuA" />);
    expect(c1.innerHTML).not.toBe(c2.innerHTML);
  });

  it('should handle empty address', () => {
    const { container } = render(<RobotAvatar address="" />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('should respect size prop', () => {
    const { container } = render(<RobotAvatar address="test" size={64} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('64');
    expect(svg?.getAttribute('height')).toBe('64');
  });
});
