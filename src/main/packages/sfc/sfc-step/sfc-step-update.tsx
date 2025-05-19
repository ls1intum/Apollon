import React, { ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import styled from 'styled-components';
import { ColorButton } from '../../../components/controls/color-button/color-button';
import { Divider } from '../../../components/controls/divider/divider';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';
import { ModelState } from '../../../components/store/model-state';
import { StylePane } from '../../../components/style-pane/style-pane';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { SfcStep } from './sfc-step';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

interface OwnProps {
  element: SfcStep;
}

type StateProps = {};

interface DispatchProps {
  update: typeof UMLElementRepository.update;
  delete: typeof UMLElementRepository.delete;
}

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

function SfcStepUpdateComponent({ element, update }: Props) {
  const [colorOpen, setColorOpen] = React.useState(false);

  const toggleColor = () => {
    setColorOpen(!colorOpen);
  };

  const rename = (name: string) => {
    update(element.id, { name });
  };

  return (
    <div>
      <section>
        <Flex>
          <Textfield value={element.name} onChange={rename} autoFocus />
          <ColorButton onClick={toggleColor} />
        </Flex>
        <StylePane open={colorOpen} element={element} onColorChange={update} fillColor lineColor textColor />
        <Divider />
      </section>
    </div>
  );
}

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<{}, DispatchProps, OwnProps, ModelState>(null, {
    update: UMLElementRepository.update,
    delete: UMLElementRepository.delete,
  }),
);

export const SfcStepUpdate = enhance(SfcStepUpdateComponent);
