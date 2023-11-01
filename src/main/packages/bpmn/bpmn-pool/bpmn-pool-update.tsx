import React, { Component, ComponentClass } from 'react';
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

class BPMNPoolUpdateComponent extends Component<Props> {
  render() {
    const { element } = this.props;

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
          <Button color="link" tabIndex={-1} onClick={this.insertSwimlane(element.id)}>
            {this.props.translate('packages.BPMN.BPMNCreateSwimlane')}
          </Button>
        </section>
      </div>
    );
  }

  /**
   * Rename the gateway
   * @param id The ID of the gateway that should be renamed
   */
  private rename = (id: string) => (value: string) => {
    this.props.update(id, { name: value });
  };

  /**
   * Delete a gateway
   * @param id The ID of the gateway that should be deleted
   */
  private delete = (id: string) => () => {
    this.props.delete(id);
  };

  /**
   * Insert a new lane into the pool. If there are already elements in the pool other than swimlanes, all existing
   * elements will be moved to the newly created swimlane.
   *
   * @param id The ID of the pool into which a new swimlane should be inserted in.
   */
  private insertSwimlane = (id: string) => () => {
    // We resolve all non-empty children of the current pool from the redux store
    const children = this.props.element.ownedElements.map((id) => this.props.getById(id)).filter(notEmpty);

    // We then check if there is currently any direct children within the pool to determine whether we need to convert
    // the pool to a swimlane-based pool or if we just need to insert a new swimlane.
    const convertToSwimlaneBased = children.every((child) => child.type !== BPMNElementType.BPMNSwimlane);

    // We then create a new swimlane object. If the pool is converted, the transfer the pools children to the swimlane
    // and size the swimlane accordingly to fit all child elements.
    const swimlane = new BPMNSwimlane({
      id: uuid(),
      name: this.props.translate('packages.BPMN.BPMNSwimlane'),
      bounds: {
        width: this.props.element.bounds.width - BPMNPool.HEADER_WIDTH,
        height: convertToSwimlaneBased ? this.props.element.bounds.height : BPMNSwimlane.DEFAULT_HEIGHT,
      },
      owner: id,
      //ownedElements: convertToSwimlaneBased ? this.props.element.ownedElements : [],
    });

    this.props.create(swimlane);

    // We then update the pool element and remove the child elements that have been transferred to the newly created
    // swim lane
    const pool = new BPMNPool({
      ...this.props.element,
      ownedElements: convertToSwimlaneBased ? [swimlane.id] : [swimlane.id, ...this.props.element.ownedElements],
    });

    this.props.update(id, pool);

    // As the last step, all child elements that were transferred from the pool to a swimlane then have their owner
    // field set to the new swimlane element.
    if (convertToSwimlaneBased) {
      children.forEach((child) => this.props.update(child.id, { owner: swimlane.id }));
    }
  };
}

export const BPMNPoolUpdate = enhance(BPMNPoolUpdateComponent);
