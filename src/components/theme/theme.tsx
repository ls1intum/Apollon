import React, { Component } from 'react';
import { ThemeProvider } from 'styled-components';
import { defaults, Styles } from './styles';

export class Theme extends Component<Props> {
  theme: Styles = {
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
