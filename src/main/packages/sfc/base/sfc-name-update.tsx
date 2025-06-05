import React, { ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import styled from 'styled-components';
import { ColorButton } from '../../../components/controls/color-button/color-button';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';
import { ModelState } from '../../../components/store/model-state';
import { StylePane } from '../../../components/style-pane/style-pane';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { IUMLElement } from '../../../services/uml-element/uml-element';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

interface OwnProps {
  element: IUMLElement;
}

interface DispatchProps {
  update: typeof UMLElementRepository.update;
}

type Props = OwnProps & DispatchProps & I18nContext;

function BaseSfcNameUpdate({ element, update }: Props) {
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
      </section>
    </div>
  );
}

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<{}, DispatchProps, OwnProps, ModelState>(null, {
    update: UMLElementRepository.update,
  }),
);

export const SfcNameUpdate = enhance(BaseSfcNameUpdate);
