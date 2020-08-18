import React, { createRef, RefObject } from 'react';
import { ColorResult, TwitterPicker } from 'react-color';
import { ColorPickerIcon } from '../controls/icon/color-picker';
import { Point } from '../../utils/geometry/point';

type Props = {
  hexColor: string;
  onColorChange: (hexColor: string) => void;
  relativeTo?: RefObject<HTMLElement>;
};

type State = {
  color: string;
  open: boolean;
  position: Point;
};

const getInitialState = (props: Props): State => {
  return {
    color: props.hexColor,
    open: false,
    position: new Point(),
  };
};

export class ColorPicker extends React.Component<Props, State> {
  state = getInitialState(this.props);
  colorPickerButton: RefObject<HTMLButtonElement> = createRef();
  colorPickerDialog: RefObject<HTMLDivElement> = createRef();

  constructor(props: Props) {
    super(props);
    this.handleChangeComplete = this.handleChangeComplete.bind(this);
    this.togglePicker = this.togglePicker.bind(this);
  }

  componentWillUnmount() {
    this.dismiss();
  }

  private handleChangeComplete = (color: ColorResult) => {
    this.setState({ color: color.hex });
    this.props.onColorChange(color.hex);
  };

  private togglePicker(event: React.MouseEvent) {
    document.addEventListener('pointerdown', this.onPointerDown);
    let colorPickerPosition: Point = new Point(0, 0);
    if (this.props.relativeTo?.current) {
      const referencePoint = this.props.relativeTo.current.getBoundingClientRect();
      const colorPickerButtonPosition = this.colorPickerButton.current!.getBoundingClientRect();
      colorPickerPosition = new Point(
        colorPickerButtonPosition.x - referencePoint.x + colorPickerButtonPosition.width - 22,
        colorPickerButtonPosition.y - referencePoint.y + colorPickerButtonPosition.height + 10,
      );
    }
    this.setState({
      open: !this.state.open,
      position: colorPickerPosition,
    });
  }

  private dismiss = (): void => {
    this.setState(getInitialState(this.props));
    document.removeEventListener('pointerdown', this.onPointerDown);
  };

  private onPointerDown = (event: PointerEvent): void => {
    if (
      this.colorPickerDialog.current &&
      event.target instanceof Node &&
      this.colorPickerDialog.current.contains(event.target)
    ) {
      return;
    }
    this.dismiss();
  };

  render() {
    return (
      <button style={{ backgroundColor: 'transparent', border: 'none' }} ref={this.colorPickerButton}>
        <ColorPickerIcon onClick={this.togglePicker}/>
        {this.state.open && (
          <div
            style={{ position: 'absolute', left: this.state.position.x, top: this.state.position.y }}
            ref={this.colorPickerDialog}
          >
            <TwitterPicker color={this.state.color} onChangeComplete={this.handleChangeComplete} />
          </div>
        )}
      </button>
    );
  }
}
