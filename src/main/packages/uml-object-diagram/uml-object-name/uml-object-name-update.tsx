import React, { Component, ComponentClass, createRef } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
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
import { AsyncDispatch } from '../../../utils/actions/actions';
import { notEmpty } from '../../../utils/not-empty';
import { UMLObjectAttribute } from '../uml-object-attribute/uml-object-attribute';
import { UMLObjectMethod } from '../uml-object-method/uml-object-method';
import { UMLObjectName } from './uml-object-name';
import UmlAttributeUpdate from '../../common/uml-classifier/uml-classifier-attribute-update';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

type State = {
  fieldToFocus?: Textfield<string> | null;
  colorOpen: boolean;
};

const getInitialState = (): State => ({
  fieldToFocus: undefined,
  colorOpen: false,
});

class ObjectNameComponent extends Component<Props, State> {
  state = getInitialState();
  newMethodField = createRef<Textfield<string>>();
  newAttributeField = createRef<Textfield<string>>();

  private toggleColor = () => {
    this.setState((state) => ({
      colorOpen: !state.colorOpen,
    }));
  };

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<{}>, snapshot?: any) {
    if (this.state.fieldToFocus) {
      this.state.fieldToFocus.focus();
      this.setState({ fieldToFocus: undefined });
    }
  }

  render() {
    const { element, getById } = this.props;
    const children = element.ownedElements.map((id) => getById(id)).filter(notEmpty);
    const attributes = children.filter((child) => child instanceof UMLObjectAttribute);
    const methods = children.filter((child) => child instanceof UMLObjectMethod);
    const attributeRefs: (Textfield<string> | null)[] = [];
    const methodRefs: (Textfield<string> | null)[] = [];

    return (
      <div>
        <section>
          <Flex>
            <Textfield value={element.name} onChange={this.rename(element.id)} autoFocus />
            <ColorButton onClick={this.toggleColor} />
            <Button color="link" tabIndex={-1} onClick={this.delete(element.id)}>
              <TrashIcon />
            </Button>
          </Flex>
          <StylePane
            open={this.state.colorOpen}
            element={element}
            onColorChange={this.props.update}
            fillColor
            lineColor
            textColor
          />
          <Divider />
        </section>
        <section>
          <Header>{this.props.translate('popup.attributes')}</Header>
          {attributes.map((attribute, index) => (
            <UmlAttributeUpdate
              id={attribute.id}
              key={attribute.id}
              value={attribute.name}
              onChange={this.props.update}
              onSubmitKeyUp={() =>
                index === attributes.length - 1
                  ? this.newAttributeField.current?.focus()
                  : this.setState({
                      fieldToFocus: attributeRefs[index + 1],
                    })
              }
              onDelete={this.delete}
              onRefChange={(ref) => (attributeRefs[index] = ref)}
              element={attribute}
            />
          ))}
          <Textfield
            ref={this.newAttributeField}
            outline
            value=""
            onSubmit={this.create(UMLObjectAttribute)}
            onSubmitKeyUp={(key: string, value: string) => {
              // if we have a value -> navigate to next field in case we want to create a new element
              if (value) {
                this.setState({
                  fieldToFocus: this.newAttributeField.current,
                });
              } else {
                // if we submit with empty value -> focus next element (either next method field or newMethodfield)
                if (methodRefs && methodRefs.length > 0) {
                  this.setState({
                    fieldToFocus: methodRefs[0],
                  });
                } else {
                  this.setState({
                    fieldToFocus: this.newMethodField.current,
                  });
                }
              }
            }}
            onKeyDown={(event) => {
              // workaround when 'tab' key is pressed:
              // prevent default and execute blur manually without switching to next tab index
              // then set focus to newAttributeField field again (componentDidUpdate)
              if (event.key === 'Tab' && event.currentTarget.value) {
                event.preventDefault();
                event.currentTarget.blur();
                this.setState({
                  fieldToFocus: this.newAttributeField.current,
                });
              }
            }}
          />
        </section>
        <section>
          <Divider />
          <Header>{this.props.translate('popup.methods')}</Header>
          {methods.map((method, index) => (
            <UmlAttributeUpdate
              id={method.id}
              key={method.id}
              value={method.name}
              onChange={this.props.update}
              onSubmitKeyUp={() =>
                index === methods.length - 1
                  ? this.newMethodField.current?.focus()
                  : this.setState({
                      fieldToFocus: methodRefs[index + 1],
                    })
              }
              onDelete={this.delete}
              onRefChange={(ref) => (methodRefs[index] = ref)}
              element={method}
            />
          ))}
          <Textfield
            ref={this.newMethodField}
            outline
            value=""
            onSubmit={this.create(UMLObjectMethod)}
            onSubmitKeyUp={() =>
              this.setState({
                fieldToFocus: this.newMethodField.current,
              })
            }
            onKeyDown={(event) => {
              // workaround when 'tab' key is pressed:
              // prevent default and execute blur manually without switching to next tab index
              // then set focus to newMethodField field again (componentDidUpdate)
              if (event.key === 'Tab' && event.currentTarget.value) {
                event.preventDefault();
                event.currentTarget.blur();
                this.setState({
                  fieldToFocus: this.newMethodField.current,
                });
              }
            }}
          />
        </section>
      </div>
    );
  }

  private create = (Clazz: typeof UMLObjectAttribute | typeof UMLObjectMethod) => (value: string) => {
    const { element, create } = this.props;
    const member = new Clazz();
    member.name = value;
    create(member, element.id);
  };

  private rename = (id: string) => (name: string) => {
    this.props.update(id, { name });
  };

  private delete = (id: string) => () => {
    this.props.delete(id);
  };
}

interface OwnProps {
  element: UMLObjectName;
}

type StateProps = {};

interface DispatchProps {
  create: typeof UMLElementRepository.create;
  update: typeof UMLElementRepository.update;
  delete: typeof UMLElementRepository.delete;
  getById: (id: string) => UMLElement | null;
}

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(null, {
    create: UMLElementRepository.create,
    update: UMLElementRepository.update,
    delete: UMLElementRepository.delete,
    getById: UMLElementRepository.getById as any as AsyncDispatch<typeof UMLElementRepository.getById>,
  }),
);

export const UMLObjectNameUpdate = enhance(ObjectNameComponent);
