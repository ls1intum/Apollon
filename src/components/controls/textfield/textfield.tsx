import React, { Component, FocusEvent, FormEvent, InputHTMLAttributes, KeyboardEvent } from 'react';
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

const initialState = {
  key: Date.now(),
};

type Props = {
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  onSubmitKeyUp?: (key: 'Escape' | 'Enter', value: string) => void;
  placeholder?: string;
  value: string;
  enterToSubmit?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'onSubmit'> &
  typeof defaultProps;

type State = typeof initialState;

export class Textfield extends Component<Props, State> {
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

  private onBlur = ({ currentTarget }: FocusEvent<HTMLInputElement>) => {
    const { value } = currentTarget;
    if (!value || !this.props.onSubmit) {
      return;
    }

    this.props.onSubmit(value);
    this.setState({ key: Date.now() });
  };

  private onChange = ({ currentTarget }: FormEvent<HTMLInputElement>) => {
    if (!this.props.onChange) {
      return;
    }

    const { value } = currentTarget;
    this.props.onChange(value);
  };

  private onKeyUp = ({ key, currentTarget }: KeyboardEvent<HTMLInputElement>) => {
    switch (key) {
      case 'Enter':
        if (this.props.enterToSubmit) {
          currentTarget.blur();
          this.onSubmitKeyUp(key, currentTarget.value);
        }
        break;
      case 'Escape':
        currentTarget.blur();
        this.onSubmitKeyUp(key, currentTarget.value);
        break;
      default:
    }
  };

  private onSubmitKeyUp = (key: 'Enter' | 'Escape', value: string) => {
    if (!this.props.onSubmitKeyUp) {
      return;
    }
    if (key === 'Enter' && !this.props.enterToSubmit) {
      return;
    }
    this.props.onSubmitKeyUp(key, value);
  };
}
