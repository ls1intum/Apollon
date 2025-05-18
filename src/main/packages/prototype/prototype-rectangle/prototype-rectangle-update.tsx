import React, { ComponentClass, useRef, useState } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { Button } from '../../../components/controls/button/button';
import { ColorButton } from '../../../components/controls/color-button/color-button';
import { Divider } from '../../../components/controls/divider/divider';
import { TrashIcon } from '../../../components/controls/icon/trash';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { Header } from '../../../components/controls/typography/typography';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';
import { ModelState } from '../../../components/store/model-state';
import { StylePane } from '../../../components/style-pane/style-pane';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { notEmpty } from '../../../utils/not-empty';
import { PrototypeLabel } from '../prototype-label/prototype-label';
import { PrototypeRectangle } from './prototype-rectangle';
import UmlAttributeUpdate from '../../common/uml-classifier/uml-classifier-attribute-update';
import { AsyncDispatch } from '../../../utils/actions/actions';
import { compose } from 'redux';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

interface OwnProps {
  element: PrototypeRectangle;
}

interface DispatchProps {
  create: typeof UMLElementRepository.create;
  update: typeof UMLElementRepository.update;
  delete: typeof UMLElementRepository.delete;
  getById: (id: string) => UMLElement | null;
}

type Props = OwnProps & DispatchProps & I18nContext;

function PrototypeRectangleUpdateComponent({
  element,
  create,
  update,
  delete: deleteElement,
  getById,
  translate,
}: Props) {
  const [colorOpen, setColorOpen] = useState(false);
  const [fieldToFocus, setFieldToFocus] = useState<Textfield<string> | null>(null);
  const newLabelField = useRef<Textfield<string>>(null);
  const labelRefs: (Textfield<string> | null)[] = [];

  const children = element.ownedElements.map((id) => getById(id)).filter(notEmpty);
  const labels = children.filter((child) => child instanceof PrototypeLabel);

  // Focus the field that was set to be focused
  React.useEffect(() => {
    if (fieldToFocus) {
      fieldToFocus.focus();
      setFieldToFocus(null);
    }
  }, [fieldToFocus]);

  const toggleColor = () => {
    setColorOpen(!colorOpen);
  };

  const rename = (id: string) => (name: string) => {
    update(id, { name });
  };

  const handleDelete = (id: string) => () => {
    deleteElement(id);
  };

  const createLabel = (value: string) => {
    const label = new PrototypeLabel({ name: value });
    create(label, element.id);
  };

  return (
    <div>
      <section>
        <Flex>
          <Textfield value={element.name} onChange={rename(element.id)} autoFocus />
          <ColorButton onClick={toggleColor} />
          <Button color="link" tabIndex={-1} onClick={handleDelete(element.id)}>
            <TrashIcon />
          </Button>
        </Flex>
        <StylePane open={colorOpen} element={element} onColorChange={update} fillColor lineColor textColor />
        <Divider />
      </section>
      <section>
        <Header>{translate('popup.labels')}</Header>
        {labels.map((label, index) => (
          <UmlAttributeUpdate
            id={label.id}
            key={label.id}
            value={label.name}
            onChange={update}
            onSubmitKeyUp={() =>
              index === labels.length - 1 ? newLabelField.current?.focus() : setFieldToFocus(labelRefs[index + 1])
            }
            onDelete={handleDelete}
            onRefChange={(ref) => (labelRefs[index] = ref)}
            element={label}
          />
        ))}
        <Textfield
          ref={newLabelField}
          outline
          value=""
          onSubmit={createLabel}
          onSubmitKeyUp={(key: string, value: string) => {
            // if we have a value -> navigate to next field in case we want to create a new element
            if (value) {
              setFieldToFocus(newLabelField.current);
            }
          }}
          onKeyDown={(event) => {
            // workaround when 'tab' key is pressed:
            // prevent default and execute blur manually without switching to next tab index
            // then set focus to newLabelField field again (useEffect)
            if (event.key === 'Tab' && event.currentTarget.value) {
              event.preventDefault();
              event.currentTarget.blur();
              setFieldToFocus(newLabelField.current);
            }
          }}
        />
      </section>
    </div>
  );
}

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<{}, DispatchProps, OwnProps, ModelState>(null, {
    create: UMLElementRepository.create,
    update: UMLElementRepository.update,
    delete: UMLElementRepository.delete,
    getById: UMLElementRepository.getById as any as AsyncDispatch<typeof UMLElementRepository.getById>,
  }),
);

export const PrototypeRectangleUpdate = enhance(PrototypeRectangleUpdateComponent);
