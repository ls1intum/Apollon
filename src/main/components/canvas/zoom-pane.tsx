import React, { FunctionComponent } from 'react';
import { clamp } from '../../utils/clamp';

type Props = {
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
};

export const ZoomPaneComponent: FunctionComponent<Props> = (props) => {
  const { min = 0.5, max = 5, step = 0.5, value, onChange } = props;

  return (
    <div style={{ position: 'absolute', left: '0.75em', bottom: '0.75em', display: 'flex' }}>
      <button
        style={{ marginRight: '0.5em' }}
        className="button-rounded"
        onClick={() => onChange(clamp(value + step, min, max))}
      >
        +
      </button>
      <button className="button-rounded" onClick={() => onChange(clamp(value - step, min, max))}>
        -
      </button>
    </div>
  );
};

export const ZoomPane = ZoomPaneComponent;
