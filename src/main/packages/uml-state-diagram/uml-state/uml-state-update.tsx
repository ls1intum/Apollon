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
import { StateElementType } from '..';
import { UMLStateVariable } from '../uml-state-variable/uml-state-variable';
import { UMLStateAction } from '../uml-state-action/uml-state-action';
import { UMLElementType } from '../../uml-element-type';
import { UMLElements } from '../../uml-elements';
import { UMLState } from './uml-state';
import UmlVariableUpdate from '../uml-state-variable/uml-state-variable-update';

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

interface OwnProps {
  element: UMLState;
}

type StateProps = {};

interface DispatchProps {
  create: typeof UMLElementRepository.create;
  update: typeof UMLElementRepository.update;
  delete: typeof UMLElementRepository.delete;
  getById: (id: string) => UMLElement | null;
}

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

interface State {
  colorOpen: boolean;
  fieldToFocus?: Textfield<string> | null;
}

const getInitialState = (): State => ({
  colorOpen: false,
});

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(null, {
    create: UMLElementRepository.create,
    update: UMLElementRepository.update,
    delete: UMLElementRepository.delete,
    getById: UMLElementRepository.getById as any as AsyncDispatch<typeof UMLElementRepository.getById>,
  }),
);

class StateUpdate extends Component<Props, State> {
  state = getInitialState();
  newActionField = createRef<Textfield<string>>();
  newVariableField = createRef<Textfield<string>>();

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
    const variables = children.filter((child) => child instanceof UMLStateVariable);
    const actions = children.filter((child) => child instanceof UMLStateAction);
    const variableRefs: (Textfield<string> | null)[] = [];
    const actionRefs: (Textfield<string> | null)[] = [];

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
          <Header>{this.props.translate('popup.variables')}</Header>
          {variables.map((variable, index) => (
            <UmlVariableUpdate
              id={variable.id}
              key={variable.id}
              value={variable.name}
              onChange={this.props.update}
              onSubmitKeyUp={() =>
                index === variables.length - 1
                  ? this.newVariableField.current?.focus()
                  : this.setState({
                      fieldToFocus: variableRefs[index + 1],
                    })
              }
              onDelete={this.delete}
              onRefChange={(ref) => (variableRefs[index] = ref)}
              element={variable}
            />
          ))}
          <Textfield
            ref={this.newVariableField}
            outline
            value=""
            onSubmit={this.create(UMLStateVariable)}
            onSubmitKeyUp={(key: string, value: string) => {
              if (value) {
                this.setState({
                  fieldToFocus: this.newVariableField.current,
                });
              } else {
                if (actionRefs && actionRefs.length > 0) {
                  this.setState({
                    fieldToFocus: actionRefs[0],
                  });
                } else {
                  this.setState({
                    fieldToFocus: this.newActionField.current,
                  });
                }
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Tab' && event.currentTarget.value) {
                event.preventDefault();
                event.currentTarget.blur();
                this.setState({
                  fieldToFocus: this.newVariableField.current,
                });
              }
            }}
          />
        </section>
        <section>
          <Divider />
          <Header>{this.props.translate('popup.actions')}</Header>
          {actions.map((action, index) => (
            <UmlVariableUpdate
              id={action.id}
              key={action.id}
              value={action.name}
              onChange={this.props.update}
              onSubmitKeyUp={() =>
                index === actions.length - 1
                  ? this.newActionField.current?.focus()
                  : this.setState({
                      fieldToFocus: actionRefs[index + 1],
                    })
              }
              onDelete={this.delete}
              onRefChange={(ref) => (actionRefs[index] = ref)}
              element={action}
            />
          ))}
          <Textfield
            ref={this.newActionField}
            outline
            value=""
            onSubmit={this.create(UMLStateAction)}
            onSubmitKeyUp={() =>
              this.setState({
                fieldToFocus: this.newActionField.current,
              })
            }
            onKeyDown={(event) => {
              if (event.key === 'Tab' && event.currentTarget.value) {
                event.preventDefault();
                event.currentTarget.blur();
                this.setState({
                  fieldToFocus: this.newActionField.current,
                });
              }
            }}
          />
        </section>
      </div>
    );
  }

  private create = (Clazz: typeof UMLStateVariable | typeof UMLStateAction) => (value: string) => {
    const { element, create } = this.props;
    const member = new Clazz();
    member.name = value;
    create(member, element.id);
  };

  private rename = (id: string) => (value: string) => {
    this.props.update(id, { name: value });
  };

  private delete = (id: string) => () => {
    this.props.delete(id);
  };
}

export const UMLStateUpdate = enhance(StateUpdate);