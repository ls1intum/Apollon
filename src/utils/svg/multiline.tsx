import React, { Component, CSSProperties, SVGProps } from 'react';
import { findDOMNode } from 'react-dom';

const defaultProps = Object.freeze({
  x: 0,
  y: 0,
  dx: 0,
  dy: 0,
  angle: 0,
  width: undefined as number | undefined,
  height: undefined as number | undefined,
  lineHeight: 16,
  capHeight: 11,
  scaleToFit: false,
  textAnchor: 'middle' as 'start' | 'middle' | 'end' | 'inherit',
  verticalAnchor: 'middle' as 'start' | 'middle' | 'end',
});

const getInitialState = (props: Props) =>  {
  const words = props.children ? props.children.toString().split(/\s+/) : [];
  return { wordsByLines: [{ words, width: 0 }] }
};

type Props = { children: string } & SVGProps<SVGTextElement> & typeof defaultProps;

type State = typeof getInitialState;

export class Multiline extends Component<Props, State> {
  static defaultProps = defaultProps;
  state = getInitialState(this.props);

  spaceWidth = 0;
  wordsWithComputedWidth = [] as { word: string; width: number }[];

  componentDidMount() {
    this.updateWordsByLines(this.props, true);
  }

  componentDidUpdate(previousProps: Readonly<Props>) {
    const needCalculate = previousProps.children !== this.props.children || previousProps.style !== this.props.style;
    if (needCalculate) {
      this.updateWordsByLines(this.props, needCalculate);
    }
  }

  calculateWordWidths = (props: Readonly<Props>) => {
    try {
      const words = props.children ? props.children.toString().split(/\s+/) : [];
      const wordsWithComputedWidth = words.map((word) => ({ word, width: this.getStringWidth(word, props.style) }));

      const spaceWidth = this.getStringWidth('\u00A0', props.style);

      return { wordsWithComputedWidth, spaceWidth };
    } catch (e) {
      return null;
    }
  };

  getStringWidth(str: string, style?: CSSProperties): number {
    try {
      // Calculate length of each word to be used to determine number of words per line
      const container = findDOMNode(this);
      if (!container) {
        return 0;
      }

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      container.appendChild(text);

      Object.assign(text.style, style);
      text.textContent = str;
      const width = text.getComputedTextLength();

      container.removeChild(text);

      return width;
    } catch (e) {
      return 0;
    }
  }

  updateWordsByLines(props: Readonly<Props>, needCalculate: boolean) {
    // Only perform calculations if using features that require them (multiline, scaleToFit)
    if (props.width || props.scaleToFit) {
      if (needCalculate) {
        const wordWidths = this.calculateWordWidths(props);

        if (wordWidths) {
          const { wordsWithComputedWidth, spaceWidth } = wordWidths;

          this.wordsWithComputedWidth = wordsWithComputedWidth;
          this.spaceWidth = spaceWidth;
        } else {
          this.updateWordsWithoutCalculate(props);

          return;
        }
      }

      const wordsByLines = this.calculateWordsByLines(this.wordsWithComputedWidth, this.spaceWidth, props.width);
      this.setState({ wordsByLines });
    } else {
      this.updateWordsWithoutCalculate(props);
    }
  }

  updateWordsWithoutCalculate(props: Readonly<Props>) {
    const words = props.children ? props.children.toString().split(/\s+/) : [];
    this.setState({ wordsByLines: [{ words, width: 0 }] });
  }

  calculateWordsByLines(
    wordsWithComputedWidth: { word: string; width: number }[],
    spaceWidth: number,
    lineWidth?: number,
  ): { words: string[]; width: number }[] {
    const { scaleToFit } = this.props;
    return wordsWithComputedWidth.reduce<{ words: string[]; width: number }[]>((result, { word, width }) => {
      const currentLine = result[result.length - 1];

      if (currentLine && (!lineWidth || scaleToFit || currentLine.width + width + spaceWidth < lineWidth)) {
        // Word can be added to an existing line
        currentLine.words.push(word);
        currentLine.width += width + spaceWidth;
      } else {
        // Add first word to line or word is too long to scaleToFit on existing line
        const newLine = { words: [word], width };
        result.push(newLine);
      }

      return result;
    }, []);
  }

  render() {
    const { dx, dy, textAnchor, verticalAnchor, scaleToFit, angle, lineHeight, capHeight, ...textProps } = this.props;
    const { wordsByLines } = this.state;

    const x = textProps.x + dx;
    const y = textProps.y + dy;

    let startDy: string | number | undefined;
    switch (verticalAnchor) {
      case 'start':
        startDy = capHeight;
        break;
      case 'middle':
        startDy = ((wordsByLines.length - 1) / 2) * -lineHeight + capHeight / 2;
        break;
      default:
        startDy = wordsByLines.length - 1 * -lineHeight;
        break;
    }

    const transforms = [];
    if (scaleToFit && wordsByLines.length) {
      const lineWidth = wordsByLines[0].width;
      const sx = (this.props.width || 0) / lineWidth;
      const sy = sx;
      const originX = x - sx * x;
      const originY = y - sy * y;
      transforms.push(`matrix(${sx}, 0, 0, ${sy}, ${originX}, ${originY})`);
    }
    if (angle) {
      transforms.push(`rotate(${angle}, ${x}, ${y})`);
    }
    if (transforms.length) {
      textProps.transform = transforms.join(' ');
    }

    return (
      <text x={x} y={y} textAnchor={textAnchor} {...textProps} pointerEvents="none">
        {wordsByLines.map((line, index) => (
          <tspan x={x} dy={index === 0 ? startDy : lineHeight} key={index}>
            {line.words.join(' ')}
          </tspan>
        ))}
      </text>
    );
  }
}
