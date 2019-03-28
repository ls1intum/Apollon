import React, { Component } from 'react';
import { ThemeProvider } from 'styled-components';
import { Styles, defaults } from './styles';

export class Theme extends Component<Props> {
  public theme: Styles = {
    ...defaults,
    ...this.props.styles,
  };

  render() {
    return <ThemeProvider theme={this.theme}>{this.props.children}</ThemeProvider>;
  }
}

interface Props {
  children?: React.ReactChild;
  styles: Partial<Styles>;
}
