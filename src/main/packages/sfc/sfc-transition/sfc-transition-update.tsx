import React, { ComponentClass, FunctionComponent, useState } from 'react';
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
import { getParsedName } from './sfc-transition-utils';

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

const SfcTransitionUpdateComponent: FunctionComponent<Props & I18nContext> = ({ element, update }) => {
  const [colorOpen, setColorOpen] = useState(false);

  const { isNegated, displayName } = getParsedName(element.name);

  function toggleColorOpen(): void {
    setColorOpen((prev) => !prev);
  }

  function handleNameChange(newDisplayName: string): void {
    const name = JSON.stringify({ isNegated, displayName: newDisplayName });
    update(element.id, { name });
  }

  function handleNegation(): void {
    const name = JSON.stringify({ isNegated: !isNegated, displayName });
    update(element.id, { name });
  }

  const [negationButtonColor, textDecoration]: ['primary' | 'secondary', 'overline' | undefined] = isNegated
    ? ['primary', 'overline']
    : ['secondary', undefined];

  return (
    <Container>
      <section>
        <Row style={{ gap: 5 }}>
          <Textfield style={{ flex: '1 1 0%', textDecoration }} value={displayName} onChange={handleNameChange} autoFocus />
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
