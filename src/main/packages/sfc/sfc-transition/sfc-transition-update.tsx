import React, { ComponentClass, useState } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { StylePane } from '../../../components/style-pane/style-pane';
import { SfcTransition } from './sfc-transition';
import styled from 'styled-components';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { ColorButton } from '../../../components/controls/color-button/color-button';
import { Button } from '../../../components/controls/button/button';
import { I18nContext } from '../../../components/i18n/i18n-context';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  padding: 10px;
  gap: 10px;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
`;

interface Props {
  element: SfcTransition;
  update: typeof UMLElementRepository.update;
}

const parseName = (element: SfcTransition): [string, boolean, string] => {
  try {
    const parsedName = JSON.parse(element.name);
    return [parsedName[0], parsedName[0] === '!', parsedName[1]];
  } catch (e) {
    element.name = JSON.stringify(['', '']);
    return ['', false, ''];
  }
};

const SfcTransitionUpdateComponent = ({ element, update }: Props & I18nContext) => {
  const [colorOpen, setColorOpen] = useState(false);

  const [negationString, isNegated, displayName] = parseName(element);

  const toggleColorOpen = () => {
    setColorOpen((prev) => !prev);
  };

  const handleNameChange = (newDisplayName: string) => {
    const name = JSON.stringify([negationString, newDisplayName]);
    update(element.id, { name });
  };

  const handleNegation = () => {
    const newNegationString = isNegated ? '' : '!';
    const name = JSON.stringify([newNegationString, displayName]);
    update(element.id, { name });
  };

  const [negationButtonColor, textDecoration]: ['primary' | 'secondary', 'overline' | undefined] = isNegated
    ? ['primary', 'overline']
    : ['secondary', undefined];

  return (
    <Container>
      <section>
        <Row style={{ gap: 5 }}>
          <Textfield style={{ flex: '1', textDecoration }} value={displayName} onChange={handleNameChange} autoFocus />
          <Button color={negationButtonColor} style={{ textDecoration: 'overline' }} onClick={() => handleNegation()}>
            X
          </Button>
          <ColorButton onClick={toggleColorOpen} />
        </Row>
        <StylePane open={colorOpen} element={element} onColorChange={update} lineColor textColor />
      </section>
    </Container>
  );
};

interface OwnProps {
  element: SfcTransition;
}

const enhance = compose<ComponentClass<OwnProps>>(
  connect(null, (dispatch) => ({
    update: (id: string, values: Partial<SfcTransition>) => dispatch(UMLElementRepository.update(id, values)),
  })),
);

/**
 * Component for editing transition properties in a sfc.
 * Provides controls for changing the transition name, negation status, and styling.
 */
export const SfcTransitionUpdate = enhance(SfcTransitionUpdateComponent);
