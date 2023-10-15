import React, { Component } from 'react';
import { DeepPartial } from 'redux';
import { ThemeProvider } from 'styled-components';
import { update } from '../../utils/update';
import { defaults, Styles } from './styles';

const defaultProps = {
  styles: {} as DeepPartial<Styles>,
};

type Props = { children?: React.ReactChild } & typeof defaultProps;

export class Theme extends Component<Props> {
  static defaultProps = defaultProps;

  theme: Styles = update(defaults(), this.props.styles);

  render() {
    return <ThemeProvider theme={this.theme}>{this.props.children}</ThemeProvider>;
  }
}
