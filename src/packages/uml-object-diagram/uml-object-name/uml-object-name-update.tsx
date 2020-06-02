import React, { Component, ComponentClass, createRef} from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import styled from 'styled-components';
import { Button } from '../../../components/controls/button/button';
import { Divider } from '../../../components/controls/divider/divider';
import { TrashIcon } from '../../../components/controls/icon/trash';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { Header } from '../../../components/controls/typography/typography';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';
import { ModelState } from '../../../components/store/model-state';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { AsyncDispatch } from '../../../utils/actions/actions';
import { notEmpty } from '../../../utils/not-empty';
import { UMLObjectAttribute } from '../uml-object-attribute/uml-object-attribute';
import { UMLObjectMethod } from '../uml-object-method/uml-object-method';
import { UMLObjectName } from './uml-object-name';
import { ObjectElementType } from '../index';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

type State = {
  fieldToFocus?: Textfield | null;
};

const getInitialState = (): State => ({
  fieldToFocus: undefined,
});

class ObjectNameComponent extends Component<Props, State> {
  state = getInitialState();
  newMethodField = createRef<Textfield>();
  newAttributeField = createRef<Textfield>();
  attributeRefs: (Textfield | null)[] = [];
  methodRefs: (Textfield | null)[] = [];

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

    return (
      <div>
        <section>
          <Flex>
            <Textfield value={element.name} onChange={this.rename(element.id)} autoFocus />
            <Button color="link" tabIndex={-1} onClick={this.delete(element.id)}>
              <TrashIcon />
            </Button>
          </Flex>
          <Divider />
        </section>
        <section>
          <Header>{this.props.translate('popup.attributes')}</Header>
          {attributes.map((attribute, index) => (
            <Flex key={attribute.id}>
              <Textfield
                ref={(ref) => (this.attributeRefs[index] = ref)}
                gutter={true}
                value={attribute.name}
                onChange={this.rename(attribute.id)}
                onSubmit={(value) =>
                  index === attributes.length - 1
                    ? this.newAttributeField.current?.focus()
                    : this.setState({
                        fieldToFocus: this.attributeRefs[index + 1],
                      })
                }
              />
              <Button color="link" tabIndex={-1} onClick={this.delete(attribute.id)}>
                <TrashIcon />
              </Button>
            </Flex>
          ))}
          <Textfield ref={this.newAttributeField} outline={true} value="" onSubmit={this.create(UMLObjectAttribute)} />
        </section>
        <section>
          <Divider />
          <Header>{this.props.translate('popup.methods')}</Header>
          {methods.map((method, index) => (
            <Flex key={method.id}>
              <Textfield
                ref={(ref) => (this.methodRefs[index] = ref)}
                gutter={true}
                value={method.name}
                onChange={this.rename(method.id)}
                onSubmit={(value) =>
                  index === methods.length - 1
                    ? this.newMethodField.current?.focus()
                    : this.setState({
                        fieldToFocus: this.methodRefs[index + 1],
                      })
                }
              />
              <Button color="link" tabIndex={-1} onClick={this.delete(method.id)}>
                <TrashIcon />
              </Button>
            </Flex>
          ))}
          <Textfield
            ref={this.newMethodField}
            outline={true}
            value=""
            onSubmit={this.create(UMLObjectMethod)}
            onKeyDown={(event) => {
              // workaround when 'tab' key is pressed:
              // prevent default and execute blur manually without switching to next tab index
              // then set focus to method field again (componentDidUpdate)
              if (event.keyCode == 9) {
                event.preventDefault();
                (event.target as HTMLElement).blur();
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
    if (member.type === ObjectElementType.ObjectAttribute) {
      this.setState({
        fieldToFocus: this.newAttributeField.current,
      });
    } else if (member.type === ObjectElementType.ObjectMethod) {
      this.setState({
        fieldToFocus: this.newMethodField.current,
      });
    }
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
    getById: (UMLElementRepository.getById as any) as AsyncDispatch<typeof UMLElementRepository.getById>,
  }),
);

export const UMLObjectNameUpdate = enhance(ObjectNameComponent);
