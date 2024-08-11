import React, { Component } from 'react';

import { StereotypeOnIcon } from '../icon/stereotype-on';
import { StereotypeOffIcon } from '../icon/stereotype-off';
import { Button } from '../button/button';

type Props = { onChange: () => void; value: boolean };

export class StereotypeToggle extends Component<Props> {
  render(): React.JSX.Element {
    const { value, onChange } = this.props;

    return (
      <Button color="link" tabIndex={-1} onClick={onChange}>
        {value ? <StereotypeOnIcon /> : <StereotypeOffIcon />}
      </Button>
    );
  }
}
