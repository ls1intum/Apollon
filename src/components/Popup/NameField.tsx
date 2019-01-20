import React, { Component } from 'react';
import { Input } from './styles';

class NameField extends Component<Props, State> {
  input: React.RefObject<HTMLInputElement> = React.createRef();

  state: State = {
    initial: this.props.initial,
    value: this.props.initial,
  };

  private onChange = (event: React.FormEvent<HTMLInputElement>) => {
    this.setState({ value: event.currentTarget.value });
  };

  private onKeyUp = (event: React.KeyboardEvent) => {
    if (!this.input.current) return;
    switch (event.key) {
      case 'Enter':
        this.input.current.blur();
        this.setState(state => ({ initial: state.value }));
        this.props.onSave(this.state.value);
        break;
      case 'Escape':
        this.input.current.blur();
        this.setState(state => ({ value: state.initial }));
        break;
    }
  };

  render() {
    return (
      <Input
        ref={this.input}
        type="text"
        autoComplete="off"
        value={this.state.value}
        onChange={this.onChange}
        onKeyUp={this.onKeyUp}
      />
    );
  }
}

interface OwnProps {
  initial: string;
  onSave: (value: string) => void;
}

type Props = OwnProps;

interface State {
  initial: string;
  value: string;
}

export default NameField;
