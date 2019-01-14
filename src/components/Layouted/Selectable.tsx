import React from 'react';

interface State {
  selected: boolean;
}

const selectable = (Component: React.ComponentType<any>) =>
  class Selectable extends React.Component<any> {
    state: State = {
      selected: false,
    };

    private onMouseDown = (event: React.MouseEvent) => {
      // event.stopPropagation();
      console.log('onMouseDown', this.props);
      this.setState({ selected: true });
    };

    private onMouseUp = (event: React.MouseEvent) => {
      this.setState({ selected: false });
    };

    render() {
      const { ...props } = this.props;
      return (
        <Component
          {...props}
          onMouseDown={this.onMouseDown}
          onMouseUp={this.onMouseUp}
          selected={this.state.selected}
        />
      );
    }
  };

export default selectable;
