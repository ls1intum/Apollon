import React, { Component, ComponentClass, PointerEvent } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { composeClassPreview } from '../../packages/class-diagram/class-preview';
import { UMLDiagramType } from '../../packages/diagram-type';
import { UMLContainer } from '../../services/uml-container/uml-container';
import { UMLContainerRepository } from '../../services/uml-container/uml-container-repository';
import { UMLElement } from '../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../services/uml-element/uml-element-repository';
import { UMLElementState } from '../../services/uml-element/uml-element-types';
import { DiagramType } from '../../typings';
import { I18nContext } from '../i18n/i18n-context';
import { localized } from '../i18n/localized';
import { ModelState } from '../store/model-state';
import { ModelStore } from '../store/model-store';
import { UMLElementFeatures } from '../uml-element/uml-element-component';
import { Preview } from './sidebar-styles';

type OwnProps = {};

type StateProps = {
  type: DiagramType;
};

type DispatchProps = {
  create: typeof UMLElementRepository.create;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const getInitialState = ({ type, translate }: Props) => {
  const previews: UMLElement[] = [];
  switch (type) {
    case UMLDiagramType.ClassDiagram: {
      previews.push(...composeClassPreview(translate));
    }
  }

  return {
    previews,
    previousEvent: null as PointerEvent<HTMLDivElement> | null,
  };
};

type State = ReturnType<typeof getInitialState>;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    state => ({
      type: state.diagram.type,
    }),
    {
      create: UMLElementRepository.create,
    },
  ),
);

class CreatePaneComponent extends Component<Props, State> {
  state = getInitialState(this.props);

  render() {
    const features: UMLElementFeatures = {
      hoverable: false,
      selectable: false,
      movable: false,
      resizable: false,
      connectable: false,
      updatable: false,
    };

    const { previews } = this.state;
    const elements = previews.reduce<UMLElementState>(
      (state, preview) => ({
        ...state,
        [preview.id]: preview,
      }),
      {},
    );

    return (
      <ModelStore initialState={{ elements, features }}>
        {Object.values(previews)
          .filter(preview => !preview.owner)
          .map((preview, index) => (
            <div key={index} onPointerDown={this.onPointerDown} onPointerUp={this.onPointerUp(preview)}>
              <Preview id={preview.id} />
            </div>
          ))}
      </ModelStore>
    );
  }

  clone = (element: UMLElement, elements: UMLElement[]): UMLElement[] => {
    if (!UMLContainerRepository.isUMLContainer(element)) {
      return [element.clone()];
    }

    const result: UMLElement[] = [];
    const clone = element.clone<UMLContainer>();
    const { ownedElements } = element;
    for (const id of ownedElements) {
      const child = elements.find(prev => prev.id === id);
      if (!child) {
        continue;
      }

      const [clonedChild, ...clonedChildren] = this.clone(child, elements);
      clonedChild.owner = clone.id;

      const index = clone.ownedElements.findIndex(x => x === id);
      clone.ownedElements[index] = clonedChild.id;
      result.push(clonedChild, ...clonedChildren);
    }

    return [clone, ...result];
  };

  create = (elements: UMLElement[]) => {
    this.props.create(elements);
  };

  private onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    this.setState({ previousEvent: {...event} });
  };

  private onPointerUp = (preview: UMLElement) => (event: PointerEvent<HTMLDivElement>) => {
    const { previousEvent } = this.state;
    if (!previousEvent) {
      return;
    }
    this.setState({ previousEvent: null });

    const withinTime = event.timeStamp - previousEvent.timeStamp < 150;
    const withinBoundsX = Math.abs(event.clientX - previousEvent.clientX) === 0;
    const withinBoundsY = Math.abs(event.clientY - previousEvent.clientY) === 0;

    if (withinTime && withinBoundsX && withinBoundsY) {
      this.create(this.clone(preview, this.state.previews));
    }
  };
}

export const CreatePane = enhance(CreatePaneComponent);
