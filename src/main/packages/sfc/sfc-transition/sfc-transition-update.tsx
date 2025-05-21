import React, { ComponentClass, useState } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { StylePane } from '../../../components/style-pane/style-pane';
import { SfcTransition } from './sfc-transition';
import styled from 'styled-components';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  padding: 10px;
  gap: 10px;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const SectionTitle = styled.div`
  font-weight: bold;
  margin-bottom: 5px;
`;

interface Props {
  element: SfcTransition;
  update: typeof UMLElementRepository.update;
}

interface State {
  colorOpen: boolean;
}

function SfcTransitionUpdateComponent({ element, update }: Props) {
  const [colorOpen, setColorOpen] = useState(false);

  const toggleColorOpen = () => {
    setColorOpen((prev) => !prev);
  };

  const handleNameChange = (name: string) => {
    update(element.id, { name });
  };

  return (
    <Container>
      <Section>
        <SectionTitle>Transition Properties</SectionTitle>
        <Textfield value={element.name} onChange={handleNameChange} placeholder="Enter transition name" />
      </Section>
      <Section>
        <SectionTitle>Style</SectionTitle>
        <StylePane open={colorOpen} element={element} onColorChange={update} textColor />
      </Section>
    </Container>
  );
}

interface OwnProps {
  element: SfcTransition;
}

const enhance = compose<ComponentClass<OwnProps>>(
  connect(null, (dispatch) => ({
    update: (id: string, values: Partial<SfcTransition>) => dispatch(UMLElementRepository.update(id, values)),
  })),
);

export const SfcTransitionUpdate = enhance(SfcTransitionUpdateComponent);
