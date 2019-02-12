import React, { Component } from 'react';
import { Input } from './styles';

class NameField extends Component<Props, State> {
  static defaultProps = {
    clearOnSave: false,
  };

  input: React.RefObject<HTMLInputElement> = React.createRef();

  state: State = {
    initial: this.sanitizeWhiteSpace(this.props.initial),
    value: this.sanitizeWhiteSpace(this.props.initial),
  };

  private sanitizeWhiteSpace(input: string) {
    return input.trim().replace(/\s+/g, ' ');
  }

  private onChange = (event: React.FormEvent<HTMLInputElement>) => {
    this.setState({ value: event.currentTarget.value });
  };

  private onKeyUp = (event: React.KeyboardEvent) => {
    if (!this.input.current) return;
    switch (event.key) {
      case 'Enter':
        this.input.current.blur();
        break;
      case 'Escape':
        this.setState(
          state => ({ value: state.initial }),
          () => this.input.current!.blur()
        );
        break;
    }
  };

  private onBlur = () => {
    if (!this.input.current) return;
    const value = this.sanitizeWhiteSpace(this.state.value);
    if (value !== this.state.initial) {
      this.props.onSave(value);
    }
    this.setState({ initial: value });
    if (this.props.clearOnSave) {
      this.setState({ initial: '', value: '' });
    }
  };

  componentWillUnmount() {
    this.onBlur();
  }

  render() {
    return (
      <Input
        ref={this.input}
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

interface OwnProps {
  initial: string;
  onSave: (value: string) => void;
  clearOnSave: boolean;
}

type Props = OwnProps;

interface State {
  initial: string;
  value: string;
}

export default NameField;
