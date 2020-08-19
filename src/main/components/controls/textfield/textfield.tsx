import React, { Component, FormEvent, InputHTMLAttributes, KeyboardEvent } from 'react';
import { Omit } from 'react-redux';
import { Size } from '../../theme/styles';
import { StyledTextfield } from './textfield-styled';

export const defaultProps = Object.freeze({
  block: true,
  gutter: false,
  multiline: false,
  outline: false,
  readonly: false,
  size: 'sm' as Size,
  enterToSubmit: true,
});

type TextfieldValue = string | number;

const initialState = {
  key: Date.now(),
};

type Props<T extends TextfieldValue> = {
  onChange?: (value: T) => void;
  onSubmit?: (value: T) => void;
  onSubmitKeyUp?: (key: 'Escape' | 'Enter', value: T) => void;
  placeholder?: string;
  value: T;
  enterToSubmit?: boolean;
} & Omit<InputHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'onSubmit' | 'value' | 'size'> &
  typeof defaultProps;

type State = typeof initialState;

export class Textfield<T extends TextfieldValue> extends Component<Props<T>, State> {
  static defaultProps = defaultProps;
  state = initialState;
  ref = React.createRef<HTMLTextAreaElement>();

  render() {
    const { onChange, onSubmit, onSubmitKeyUp, size, value, ...props } = this.props;

    return (
      <StyledTextfield
        as={props.multiline ? 'textarea' : 'input'}
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
    this.setState({ key: Date.now() });
  };

  private onChange = ({ currentTarget }: FormEvent<HTMLTextAreaElement>) => {
    if (!this.props.onChange) {
      return;
    }

    const value: T = typeof this.props.value === 'number' ? (+currentTarget.value as T) : (currentTarget.value as T);
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
