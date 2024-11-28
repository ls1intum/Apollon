import React, { useState } from 'react';
import styled from 'styled-components';
import { Button } from '../../../components/controls/button/button';
import { ColorButton } from '../../../components/controls/color-button/color-button';
import { TrashIcon } from '../../../components/controls/icon/trash';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { StylePane } from '../../../components/style-pane/style-pane';
import { IUMLElement } from '../../../services/uml-element/uml-element';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

type Props = {
  id: string;
  onRefChange: (instance: Textfield<any>) => void;
  value: string;
  onChange: (id: string, values: { name?: string; fillColor?: string; textColor?: string; lineColor?: string }) => void;
  onSubmitKeyUp: () => void;
  onDelete: (id: string) => () => void;
  element: IUMLElement;
};

const UmlBodyUpdate = ({ id, onRefChange, value, onChange, onSubmitKeyUp, onDelete, element }: Props) => {
  const [colorOpen, setColorOpen] = useState(false);

  const toggleColor = () => {
    setColorOpen(!colorOpen);
  };

  const handleNameChange = (newName: string) => {
    onChange(id, { name: newName });
  };

  const handleDelete = () => {
    onDelete(id)();
  };

  return (
    <>
      <Flex>
        <Textfield ref={onRefChange} gutter value={value} onChange={handleNameChange} onSubmitKeyUp={onSubmitKeyUp} />
        <ColorButton onClick={toggleColor} />
        <Button color="link" tabIndex={-1} onClick={handleDelete}>
          <TrashIcon />
        </Button>
      </Flex>
      <StylePane open={colorOpen} element={element} onColorChange={onChange} fillColor textColor />
    </>
  );
};

export default UmlBodyUpdate;
