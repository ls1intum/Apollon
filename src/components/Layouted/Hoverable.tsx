import React from 'react';

interface State {
  hover: boolean;
}

const hoverable = (Component: React.ComponentType<any>) =>
  class Hoverable extends React.Component {
    state: State = {
      hover: false,
    };

    private onMouseOver = (event: React.MouseEvent) => {
      event.stopPropagation();
      this.setState({ hover: true });
    };

    private onMouseOut = (event: React.MouseEvent) => {
      this.setState({ hover: false });
    };

    render() {
      const { ...props } = this.props;
      return (
        <Component
          {...props}
          onMouseOver={this.onMouseOver}
          onMouseOut={this.onMouseOut}
          hover={this.state.hover}
        />
      );
    }
  };

export default hoverable;
