import React, { Component } from 'react';
import { ThemeProvider } from 'styled-components';
import Styles, { defaultTheme } from './Styles';

class Theme extends Component<Props> {
  public theme: Styles;

  constructor(props: Readonly<Props>) {
    super(props);
    this.theme = {
      ...defaultTheme,
      ...props.theme,
    };
  }

  render() {
    return (
      <ThemeProvider theme={this.theme}>{this.props.children}</ThemeProvider>
    );
  }
}

interface Props {
  children?: React.ReactChild;
  theme: Partial<Styles>;
}

export default Theme;
