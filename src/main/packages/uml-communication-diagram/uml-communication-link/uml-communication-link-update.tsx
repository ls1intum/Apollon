import React, { Component, ComponentClass, createRef } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { Button } from '../../../components/controls/button/button.js';
import { Divider } from '../../../components/controls/divider/divider.js';
import { ArrowLeftIcon } from '../../../components/controls/icon/arrow-left.js';
import { ArrowRightIcon } from '../../../components/controls/icon/arrow-right.js';
import { TrashIcon } from '../../../components/controls/icon/trash.js';
import { Textfield } from '../../../components/controls/textfield/textfield.js';
import { Header } from '../../../components/controls/typography/typography.js';
import { I18nContext } from '../../../components/i18n/i18n-context.js';
import { localized } from '../../../components/i18n/localized.js';
import { ModelState } from '../../../components/store/model-state.js';
import { styled } from '../../../components/theme/styles.js';
import { UMLElement } from '../../../services/uml-element/uml-element.js';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository.js';
import { UMLRelationshipRepository } from '../../../services/uml-relationship/uml-relationship-repository.js';
import { AsyncDispatch } from '../../../utils/actions/actions.js';
import { UMLCommunicationLink } from './uml-communication-link.js';
import { uuid } from '../../../utils/uuid.js';
import { CommunicationLinkMessage, ICommunicationLinkMessage } from './uml-communiction-link-message.js';
import { ColorButton } from '../../../components/controls/color-button/color-button.js';
import { StylePane } from '../../../components/style-pane/style-pane.js';

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

class CommunicationLinkUpdate extends Component<Props, State> {
  state = getInitialState();
  newCommunicationLinkField = createRef<Textfield<string>>();
  messageRefs: (Textfield<string> | null)[] = [];

  private toggleColor = () => {
    this.setState((state) => ({
      colorOpen: !state.colorOpen,
    }));
  };

  componentDidMount() {
    this.setState({ fieldToFocus: this.newCommunicationLinkField.current });
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<{}>, snapshot?: any) {
    if (this.state.fieldToFocus) {
      this.state.fieldToFocus.focus();
      this.setState({ fieldToFocus: undefined });
    }
  }
  render() {
    const { element, getById } = this.props;
    const source = element.source && getById(element.source.element);
    const target = element.target && getById(element.target.element);
    if (!source || !target) return null;

    return (
      <div>
        <section>
          <Flex>
            <Header gutter={false}>{this.props.translate('packages.CommunicationDiagram.CommunicationLink')}</Header>
            <ColorButton onClick={this.toggleColor} />
            <Button color="link" onClick={() => this.props.delete(element.id)}>
              <TrashIcon />
            </Button>
          </Flex>
          <StylePane
            open={this.state.colorOpen}
            element={element}
            onColorChange={this.props.update}
            lineColor
            textColor
          />
          <Divider />
        </section>
        <section>
          <Header>
            {this.props.translate('popup.messages')} (
            <small>
              {source.name} ⟶ {target.name}
            </small>
            )
          </Header>
          {element.messages.map((message, i) => (
            <Flex key={message.id}>
              <Textfield
                ref={(ref) => (this.messageRefs[i] = ref)}
                gutter
                value={message.name}
                onChange={this.rename(message)}
                onSubmitKeyUp={() =>
                  i === element.messages.length - 1
                    ? this.newCommunicationLinkField.current?.focus()
                    : this.setState({
                        fieldToFocus: this.messageRefs[i + 1],
                      })
                }
              />
              <Button color="link" tabIndex={-1} onClick={this.flip(message)}>
                {message.direction === 'source' ? <ArrowRightIcon /> : <ArrowLeftIcon />}
              </Button>
              <Button color="link" tabIndex={-1} onClick={this.delete(message)}>
                <TrashIcon />
              </Button>
            </Flex>
          ))}
          <Textfield
            ref={this.newCommunicationLinkField}
            outline
            value=""
            onSubmit={this.create}
            onSubmitKeyUp={() =>
              this.setState({
                fieldToFocus: this.newCommunicationLinkField.current,
              })
            }
            onKeyDown={(event) => {
              // workaround when 'tab' key is pressed:
              // prevent default and execute blur manually without switching to next tab index
              // then set focus to newCommunicationLink field again (componentDidUpdate)
              if (event.key === 'Tab' && event.currentTarget.value) {
                event.preventDefault();
                event.currentTarget.blur();
                this.setState({
                  fieldToFocus: this.newCommunicationLinkField.current,
                });
              }
            }}
          />
        </section>
      </div>
    );
  }

  private create = (value: string) => {
    const { element, update } = this.props;
    if (!element.messages.find((message) => message.name === value)) {
      update<UMLCommunicationLink>(element.id, {
        messages: [...element.messages, new CommunicationLinkMessage({ id: uuid(), name: value, direction: 'source' })],
      });
    }
  };

  private rename = (value: ICommunicationLinkMessage) => (name: string) => {
    const { element, update } = this.props;
    const messages: ICommunicationLinkMessage[] = [...element.messages];
    const index = messages.findIndex((message) => message.name === value.name);
    messages[index].name = name;
    update<UMLCommunicationLink>(element.id, { messages });
  };

  private flip = (value: ICommunicationLinkMessage) => () => {
    const { element, update } = this.props;
    const messages: ICommunicationLinkMessage[] = [...element.messages];
    const index = messages.findIndex((message) => message.name === value.name);
    messages[index].direction = messages[index].direction === 'source' ? 'target' : 'source';
    update<UMLCommunicationLink>(element.id, { messages });
  };

  private delete = (value: ICommunicationLinkMessage) => () => {
    const { element, update } = this.props;
    update<UMLCommunicationLink>(element.id, {
      messages: element.messages.filter((message) => message.name !== value.name),
    });
  };
}

type OwnProps = {
  element: UMLCommunicationLink;
};

type StateProps = {};

type DispatchProps = {
  update: typeof UMLElementRepository.update;
  delete: typeof UMLElementRepository.delete;
  flip: typeof UMLRelationshipRepository.flip;
  getById: (id: string) => UMLElement | null;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(null, {
    update: UMLElementRepository.update,
    delete: UMLElementRepository.delete,
    flip: UMLRelationshipRepository.flip,
    getById: UMLElementRepository.getById as any as AsyncDispatch<typeof UMLElementRepository.getById>,
  }),
);

export const UMLCommunicationLinkUpdate = enhance(CommunicationLinkUpdate);
