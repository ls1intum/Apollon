import React, { Component, FocusEvent, FormEvent, HTMLProps, KeyboardEvent } from 'react';
import { Omit } from 'react-redux';
import { Size } from '../../theme/styles';
import { StyledTextfield } from './textfield-styled';

export const defaultProps = Object.freeze({
  block: true,
  readonly: false,
  size: 'sm' as Size,
});

const initialState = {
  key: Date.now(),
};

type Props = {
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  value: string;
} & Omit<HTMLProps<HTMLInputElement>, 'ref' | 'as' | 'onChange' | 'onSubmit'> &
  typeof defaultProps;

type State = typeof initialState;

export class Textfield extends Component<Props, State> {
  static defaultProps = defaultProps;
  state = initialState;

  render() {
    const { onChange, onSubmit, size, value, ...props } = this.props;
    const modifiedSize: number | undefined = size === 'sm' ? -1 : size === 'lg' ? 1 : undefined;

    return (
      <StyledTextfield
        key={this.state.key}
        {...props}
        size={modifiedSize}
        defaultValue={value}
        onChange={this.onChange}
        onKeyUp={this.onKeyUp}
        onBlur={this.onBlur}
      />
    );
  }

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
      case 'Escape':
        currentTarget.blur();
        break;
    }
  };

  private onBlur = ({ currentTarget }: FocusEvent<HTMLInputElement>) => {
    const { value } = currentTarget;
    if (!value || !this.props.onSubmit) return;

    this.props.onSubmit(value);
    this.setState({ key: Date.now() });
  };
}
