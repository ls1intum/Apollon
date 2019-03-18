import React, { Component } from 'react';
import styled from 'styled-components';

export const Input = styled.input`
  display: block;
  width: 100%;
  font-size: 0.9rem;
  padding: 5px 8px;
  border: 1px solid #ccc;
  border-radius: 3px;
`;

class TextField extends Component<Props, State> {
  state = {
    value: this.props.value,
  };

  private onChange = ({ currentTarget }: React.FormEvent<HTMLInputElement>) => {
    const { value } = currentTarget;
    this.setState({ value });
    this.props.onChange && this.props.onChange(value);
  };

  private onKeyUp = ({
    key,
    currentTarget,
  }: React.KeyboardEvent<HTMLInputElement>) => {
    switch (key) {
      case 'Enter':
        currentTarget.blur();
        break;
      case 'Escape':
        this.setState({ value: this.props.value }, () => currentTarget.blur());
        break;
    }
  };

  private onBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const { value } = event.currentTarget;
    if (!value) return;
    this.props.onCreate && this.props.onCreate(value);
    this.setState({ value: this.props.value });
  };

  render() {
    return (
      <Input
        type="text"
        autoComplete="off"
        value={this.state.value}
        onChange={this.onChange}
        onKeyUp={this.onKeyUp}
        onBlur={this.onBlur}
      />
    );
  }
}

interface Props {
  value: string;
  onChange?: (value: string) => void;
  onCreate?: (value: string) => void;
}

interface State {
  value: string;
}

export default TextField;
