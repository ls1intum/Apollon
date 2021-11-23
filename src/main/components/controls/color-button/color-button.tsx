import React from 'react';
import { connect } from 'react-redux';
import { ModelState } from '../../store/model-state';
import { Button } from '../button/button';
import { RollerIcon } from '../icon/roller';

type Props = { onClick: any; colorEnabled?: boolean };

export function ColorButtonComponent({ onClick, colorEnabled }: Props) {
  if (!colorEnabled) {
    return null;
  }

  return (
    <Button color="link" tabIndex={-1} onClick={onClick}>
      <RollerIcon />
    </Button>
  );
}
type OwnProps = {};

type StateProps = {};

type DispatchProps = {};

export const ColorButton = connect<StateProps, DispatchProps, OwnProps, ModelState>((state) => ({
  colorEnabled: state.editor.colorEnabled,
}))(ColorButtonComponent);
