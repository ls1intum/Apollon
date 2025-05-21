import React, { ComponentClass, useState } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { StylePane } from '../../../components/style-pane/style-pane';
import { SfcTransition } from './sfc-transition';
import styled from 'styled-components';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { Row } from '../base/layout';
import { Header } from '../../../components/controls/typography/typography';
import { ColorButton } from '../../../components/controls/color-button/color-button';
import { Button } from '../../../components/controls/button/button';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  padding: 10px;
  gap: 10px;
`;

interface Props {
  element: SfcTransition;
  update: typeof UMLElementRepository.update;
}

function SfcTransitionUpdateComponent({ element, update, translate }: Props & I18nContext) {
  const [colorOpen, setColorOpen] = useState(false);

  const toggleColorOpen = () => {
    setColorOpen((prev) => !prev);
  };

  const handleNameChange = (displayName: string) => {
    const name = element.name.startsWith('!') ? `!${displayName}` : displayName;
    update(element.id, { name });
  };

  const handleNegation = () => {
    const name = element.name.startsWith('!') ? element.name.substring(1) : `!${element.name}`;
    update(element.id, { name });
  };

  const displayName = (name: string) => (name.startsWith('!') ? name.substring(1) : name);
  const negationButtonColor = (name: string) => (name.startsWith('!') ? 'primary' : 'secondary');

  return (
    <Container>
      <section>
        <Row>
          <Header style={{ flex: '1' }}>{translate('packages.Sfc.Transition')}</Header>
          <ColorButton onClick={() => setColorOpen((prevState) => !prevState)} />
        </Row>
        <StylePane open={colorOpen} element={element} onColorChange={update} lineColor textColor />

        <Row style={{ gap: 5 }}>
          <Textfield style={{ flex: '1' }} value={displayName(element.name)} onChange={handleNameChange} />
          <Button
            color={negationButtonColor(element.name)}
            style={{ textDecoration: 'overline' }}
            onClick={() => handleNegation()}
          >
            X
          </Button>
        </Row>
      </section>
    </Container>
  );
}

interface OwnProps {
  element: SfcTransition;
}

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect(null, (dispatch) => ({
    update: (id: string, values: Partial<SfcTransition>) => dispatch(UMLElementRepository.update(id, values)),
  })),
);

export const SfcTransitionUpdate = enhance(SfcTransitionUpdateComponent);
