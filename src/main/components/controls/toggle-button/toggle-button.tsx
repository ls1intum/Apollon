import React, { Component } from 'react';
import { Color, Size } from '../../theme/styles';
import { Button } from '../button/button';

type Props = { onChange: () => void; value: boolean };

export class ToggleButton extends Component<Props> {
  render() {
    const { value, onChange } = this.props;

    return (
      <Button color="link" tabIndex={-1} onClick={onChange} toggle={true} toggleValue={value}>
        «»
      </Button>
    );
  }
}
