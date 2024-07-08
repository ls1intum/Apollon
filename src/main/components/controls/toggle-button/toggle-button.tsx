import React, { Component } from 'react';

import { VisibilityOnIcon } from '../icon/visibility-on';
import { VisibilityOffIcon } from '../icon/visibility-off';
import { Button } from '../button/button';

type Props = { onChange: () => void; value: boolean };

export class ToggleButton extends Component<Props> {
  render() {
    const { value, onChange } = this.props;

    return (
      <Button color="link" tabIndex={-1} onClick={onChange}>
        {value ? <VisibilityOnIcon /> : <VisibilityOffIcon />}
      </Button>
    );
  }
}
