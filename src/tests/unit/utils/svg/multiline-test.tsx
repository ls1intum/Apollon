import * as React from 'react';
import { CSSProperties } from 'react';
import { render } from '@testing-library/react';
import { Multiline } from '../../../../main/utils/svg/multiline';
import '@testing-library/jest-dom';

// override getStringWidth, because it uses by jsdom unsupported SVGElement methods
Multiline.prototype.getStringWidth = (str: string, style?: CSSProperties) => {
  return 0;
};

describe('test multiline', () => {
  it('render the multiline', () => {
    const multilineText: string = 'a';
    const { getByText } = render(
      <svg>
        <Multiline width={100}>{multilineText}</Multiline>
      </svg>,
    );
    expect(getByText(multilineText)).toBeInTheDocument();
  });
});
