import React, { Component, ComponentClass, createRef } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { Button } from '../../../components/controls/button/button';
import { Divider } from '../../../components/controls/divider/divider';
import { TrashIcon } from '../../../components/controls/icon/trash';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { I18nContext } from '../../../components/i18n/i18n-context';
import { localized } from '../../../components/i18n/localized';
import { ModelState } from '../../../components/store/model-state';
import { styled } from '../../../components/theme/styles';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { BPMNSwimlane } from '../bpmn-swimlane/bpmn-swimlane';
import { BPMNPool } from './bpmn-pool';
import { uuid } from '../../../utils/uuid';
import { notEmpty } from '../../../utils/not-empty';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { AsyncDispatch } from '../../../utils/actions/actions';
import { BPMNElementType } from '../index';
import { Header } from '../../../components/controls/typography/typography';
import UmlAttributeUpdate from '../../common/uml-classifier/uml-classifier-attribute-update';
import { ColorButton } from '../../../components/controls/color-button/color-button';
import { StylePane } from '../../../components/style-pane/style-pane';

interface OwnProps {
  element: BPMNPool;
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

const Flex = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`;

type State = {
  fieldToFocus?: Textfield<string> | null;
  colorOpen: boolean;
};

class BPMNPoolUpdateComponent extends Component<Props, State> {
  state = { colorOpen: false };

  newSwimlaneField = createRef<Textfield<string>>();

  private toggleColor = () => {
    this.setState((state) => ({
      colorOpen: !state.colorOpen,
    }));
  };

  render() {
    const { element, getById } = this.props;

    const swimlaneRefs: (Textfield<string> | null)[] = [];

    const swimlanes = element.ownedElements
      .map((id) => getById(id))
      .filter(notEmpty)
      .filter((element) => element.type === BPMNElementType.BPMNSwimlane);

    return (
      <div>
        <section>
          <Flex>
            <Textfield value={element.name} onChange={(value) => this.rename(element.id, value)} autoFocus />
            <ColorButton onClick={this.toggleColor} />
            <Button color="link" tabIndex={-1} onClick={() => this.delete(element.id)}>
              <TrashIcon />
            </Button>
          </Flex>
        </section>
        <section>
          <StylePane
            open={this.state.colorOpen}
            element={element}
            onColorChange={this.props.update}
            lineColor
            textColor
            fillColor
          />
        </section>
        <section>
          <Divider />
          <Header>{this.props.translate('packages.BPMN.BPMNSwimlanes')}</Header>
          {swimlanes.reverse().map((swimlane, index) => (
            <UmlAttributeUpdate
              id={swimlane.id}
              key={swimlane.id}
              value={swimlane.name}
              onChange={this.props.update}
              onSubmitKeyUp={() =>
                index === swimlanes.length - 1
                  ? this.newSwimlaneField.current?.focus()
                  : this.setState({
                      fieldToFocus: swimlaneRefs[index + 1],
                    })
              }
              onDelete={(id) => () => this.delete(id)}
              onRefChange={(ref) => (swimlaneRefs[index] = ref)}
              element={swimlane}
            />
          ))}
          <Textfield
            ref={this.newSwimlaneField}
            outline
            value=""
            onSubmit={(name) => this.insertSwimlane(element.id, name)}
            onSubmitKeyUp={() =>
              this.setState({
                fieldToFocus: this.newSwimlaneField.current,
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
                  fieldToFocus: this.newSwimlaneField.current,
                });
              }
            }}
          />
        </section>
      </div>
    );
  }

  /**
   * Rename the gateway
   * @param id The ID of the pool that should be renamed
   * @param name The name the pool should be renamed to
   */
  private rename = (id: string, name: string) => {
    this.props.update(id, { name: name });
  };

  /**
   * Delete a pool
   * @param id The ID of the pool that should be deleted
   */
  private delete = (id: string) => {
    this.props.delete(id);
  };

  /**
   * Insert a new lane into the pool. If there are already elements in the pool other than swimlanes, all existing
   * elements will be moved to the newly created swimlane.
   *
   * @param owner The ID of the pool into which a new swimlane should be inserted in.
   * @param name Optional name for the newly created swimlane.
   */
  private insertSwimlane = (owner: string, name?: string) => {
    // We resolve all non-empty children of the current pool from the redux store
    const children = this.props.element.ownedElements.map((id) => this.props.getById(id)).filter(notEmpty);

    // We then check if there is currently any direct children within the pool to determine whether we need to convert
    // the pool to a swimlane-based pool or if we just need to insert a new swimlane.
    const convertToSwimlaneBased = children.every((child) => child.type !== BPMNElementType.BPMNSwimlane);

    // We then create a new swimlane object. If the pool is converted, the transfer the pools children to the swimlane
    // and size the swimlane accordingly to fit all child elements.
    const swimlane = new BPMNSwimlane({
      id: uuid(),
      name: name ?? this.props.translate('packages.BPMN.BPMNSwimlane'),
      bounds: {
        x: BPMNPool.HEADER_WIDTH,
        width: this.props.element.bounds.width - BPMNPool.HEADER_WIDTH,
        height: convertToSwimlaneBased ? this.props.element.bounds.height : BPMNSwimlane.DEFAULT_HEIGHT,
      },
      ownedElements: convertToSwimlaneBased ? this.props.element.ownedElements : [],
    });

    this.props.create(swimlane, owner);

    // We then update the pool element and remove the child elements that have been transferred to the newly created
    // swim lane
    const pool = new BPMNPool({
      ...this.props.element,
      ownedElements: convertToSwimlaneBased ? [swimlane.id] : [swimlane.id, ...this.props.element.ownedElements],
    });

    this.props.update(owner, pool);

    // As the last step, all child elements that were transferred from the pool to a swimlane then have their owner
    // field set to the new swimlane element.
    if (convertToSwimlaneBased) {
      children.forEach((child) => this.props.update(child.id, { owner: swimlane.id }));
    }
  };
}

export const BPMNPoolUpdate = enhance(BPMNPoolUpdateComponent);
