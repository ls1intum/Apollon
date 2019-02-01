import { Component, ComponentClass } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { State as ReduxState } from './../Store';
import CanvasContext, { withCanvas } from './CanvasContext';
import Element, { ElementRepository } from '../../domain/Element';
import { getAllRelationships } from '../../services/redux';
import Relationship from '../../domain/Relationship';
import Container from '../../domain/Container';

class KeyboardEventListener extends Component<Props> {
  private eventListener = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'Backspace':
      case 'Delete':
        const elements: Element[] = [
          ...this.props.elements,
          ...this.props.relationships,
        ];
        const selection = elements.filter(e => e.selected);

        const rec = (es: Element[]): Element[] => {
          let result = [...es];
          for (const e of es) {
            result = [
              ...this.props.relationships.filter(
                r => r.source.entityId === e.id || r.target.entityId === e.id
              ),
              ...result,
            ];
            if (e instanceof Container) {
              result = [
                ...rec(
                  e.ownedElements.map(id => elements.find(e => e.id === id)!)
                ),
                ...result,
              ];
            }
          }
          return result;
        };
        rec(selection).forEach(this.props.delete);
        break;
    }
  };

  componentDidMount() {
    this.props.canvas.addEventListener('keyup', this.eventListener);
  }

  componentWillUnmount() {
    this.props.canvas.removeEventListener('keyup', this.eventListener);
  }

  render() {
    return null;
  }
}

interface OwnProps {}

interface StateProps {
  elements: Element[];
  relationships: Relationship[];
}

interface DispatchProps {
  delete: typeof ElementRepository.delete;
}

type Props = OwnProps & StateProps & DispatchProps & CanvasContext;

export default compose<ComponentClass<OwnProps>>(
  withCanvas,
  connect(
    (state: ReduxState): StateProps => ({
      elements: ElementRepository.read(state),
      relationships: getAllRelationships(state),
    }),
    {
      delete: ElementRepository.delete,
    }
  )
)(KeyboardEventListener);
