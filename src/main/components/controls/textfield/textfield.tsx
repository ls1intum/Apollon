import React, { Component, FormEvent, InputHTMLAttributes, KeyboardEvent } from 'react';
import { Size } from '../../theme/styles';
import { StyledTextfield } from './textfield-styled';

export const defaultProps = Object.freeze({
  block: true as boolean,
  gutter: false as boolean,
  multiline: false as boolean,
  outline: false as boolean,
  readonly: false as boolean,
  size: 'sm' as Size,
  enterToSubmit: true as boolean,
});

type TextfieldValue = string | number;

const getInitialState = <T extends TextfieldValue>() => ({
  key: Date.now(),
  currentValue: undefined,
});

type Props<T extends TextfieldValue> = {
  onChange?: (value: T) => void;
  onSubmit?: (value: T) => void;
  onSubmitKeyUp?: (key: 'Escape' | 'Enter', value: T) => void;
  placeholder?: string;
  value: T;
  enterToSubmit?: boolean;
} & Omit<InputHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'onSubmit' | 'value' | 'size'> &
  typeof defaultProps;

type State<T extends TextfieldValue> = {
  key: number;
  currentValue?: T;
};

export class Textfield<T extends TextfieldValue> extends Component<Props<T>, State<T>> {
  static defaultProps = defaultProps;
  state = getInitialState<T>();
  ref = React.createRef<HTMLTextAreaElement>();

  componentDidUpdate(prevProps: Readonly<Props<T>>, prevState: Readonly<State<T>>, snapshot?: any) {
    // workaround for infinity values -> if set to infinity -> change key of component to avoid problems with textfield
    if (Number.isFinite(prevProps.value) && !Number.isFinite(this.props.value)) {
      this.setState({ key: Date.now() });
    }
  }

  componentWillUnmount() {
    if (!this.state.currentValue || !this.props.onSubmit) {
      return;
    }

    this.props.onSubmit(this.state.currentValue!);
  }

  render() {
    const { onChange, onSubmit, onSubmitKeyUp, size, value, ...props } = this.props;

    return (
      <StyledTextfield
        as={props.multiline ? 'textarea' : 'input'}
        maxLength={props.multiline ? undefined : 100}
        key={this.state.key}
        {...props}
        size={size}
        defaultValue={value}
        onChange={this.onChange}
        onKeyUp={this.onKeyUp}
        onBlur={this.onBlur}
        ref={this.ref}
      />
    );
  }

  focus() {
    if (this.ref.current) {
      this.ref.current.focus();
    }
  }

  private onBlur = ({ currentTarget }: FormEvent<HTMLTextAreaElement>) => {
    const value: T = typeof this.props.value === 'number' ? (+currentTarget.value as T) : (currentTarget.value as T);
    if (!value || !this.props.onSubmit) {
      return;
    }

    this.props.onSubmit(value);
    this.setState(getInitialState());
  };

  private onChange = ({ currentTarget }: FormEvent<HTMLTextAreaElement>) => {
    const value: T = typeof this.props.value === 'number' ? (+currentTarget.value as T) : (currentTarget.value as T);
    this.setState({ currentValue: value });

    if (!this.props.onChange) {
      return;
    }

    this.props.onChange(value);
  };

  private onKeyUp = ({ key, currentTarget }: KeyboardEvent<HTMLTextAreaElement>) => {
    const value: T = typeof this.props.value === 'number' ? (+currentTarget.value as T) : (currentTarget.value as T);
    switch (key) {
      case 'Enter':
        if (this.props.enterToSubmit) {
          currentTarget.blur();
          this.onSubmitKeyUp(key, value);
        }
        break;
      case 'Escape':
        currentTarget.blur();
        this.onSubmitKeyUp(key, value);
        break;
      default:
    }
  };

  private onSubmitKeyUp = (key: 'Enter' | 'Escape', value: T) => {
    if (!this.props.onSubmitKeyUp) {
      return;
    }
    if (key === 'Enter' && !this.props.enterToSubmit) {
      return;
    }
    this.props.onSubmitKeyUp(key, value);
  };
}
