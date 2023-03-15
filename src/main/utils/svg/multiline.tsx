import React, { Component, CSSProperties, SVGProps } from 'react';

const defaultProps = Object.freeze({
  x: 0 as number,
  y: 0 as number,
  dx: 0 as number,
  dy: 0 as number,
  angle: 0 as number,
  width: undefined as number | undefined,
  height: undefined as number | undefined,
  lineHeight: 16 as number,
  capHeight: 11 as number,
  scaleToFit: false,
  textAnchor: 'middle' as 'start' | 'middle' | 'end' | 'inherit',
  verticalAnchor: 'middle' as 'start' | 'middle' | 'end',
});

const getInitialState = (props: Props) => {
  const words = props.children ? props.children.toString().split(/\s+/) : [];
  return { wordsByLines: [{ words, width: 0 }] };
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
    const needCalculate = this.shouldCalculateWidth(previousProps);
    if (needCalculate) {
      this.updateWordsByLines(this.props, needCalculate);
    }
  }

  shouldCalculateWidth = (previousProps: Readonly<Props>) => {
    return (
      previousProps.children !== this.props.children ||
      previousProps.style !== this.props.style ||
      previousProps.width !== this.props.width ||
      previousProps.height !== this.props.height
    );
  };

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
      const divElem = document.createElement('div');
      divElem.innerHTML = str;
      Object.assign(divElem.style, style);
      const width = this.calculateStringWidth(divElem, (el: any) => {
        return el.clientWidth + 2;
      });

      return width;
    } catch (e) {
      return 0;
    }
  }

  calculateStringWidth(divElem: any, fn: any) {
    divElem.style.visibility = 'hidden';
    divElem.style.position = 'absolute';
    document.body.appendChild(divElem);
    const result = fn(divElem);
    divElem.parentNode.removeChild(divElem);
    return result;
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
    const { x, y, dx, dy, textAnchor, verticalAnchor, scaleToFit, angle, lineHeight, capHeight, fill, ...textProps } =
      this.props;
    const { wordsByLines } = this.state;

    const xPosition = x + dx;
    const yPosition = y + dy;

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
      const originX = xPosition - sx * xPosition;
      const originY = yPosition - sy * yPosition;
      transforms.push(`matrix(${sx}, 0, 0, ${sy}, ${originX}, ${originY})`);
    }
    if (angle) {
      transforms.push(`rotate(${angle}, ${xPosition}, ${yPosition})`);
    }
    if (transforms.length) {
      textProps.transform = transforms.join(' ');
    }

    return (
      <text
        style={fill ? { fill } : {}}
        x={xPosition}
        y={yPosition}
        textAnchor={textAnchor}
        {...textProps}
        pointerEvents="none"
      >
        {wordsByLines.map((line, index) => (
          <tspan x={xPosition} dy={index === 0 ? startDy : lineHeight} key={index}>
            {line.words.join(' ')}
          </tspan>
        ))}
      </text>
    );
  }
}
