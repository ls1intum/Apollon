import React, { Component } from 'react';
import { DeepPartial } from 'redux';
import { ThemeProvider } from 'styled-components';
import { update } from '../../utils/update.js';
import { defaults, Styles } from './styles.js';

const defaultProps = {
  styles: {} as DeepPartial<Styles>,
  scale: 1.0,
};

type Props = { children?: React.ReactChild } & typeof defaultProps;

export class Theme extends Component<Props> {
  static defaultProps = defaultProps;

  theme: Styles = update(defaults(this.props.scale), this.props.styles);

  render() {
    return <ThemeProvider theme={this.theme}>{this.props.children}</ThemeProvider>;
  }
}
