import { Action as ReduxAction } from 'redux';
import { State } from './../../components/Store';
import { ActionTypes, DiagramState } from './DiagramTypes';
import Diagram from './Diagram';

interface Action<T extends ActionTypes> extends ReduxAction<T> {
  type: T;
}

export type Actions = Action<any>;

class DiagramRepository {
  static read = (state: State): Diagram => {
    const diagram: DiagramState = state.diagram;
    return Object.setPrototypeOf(diagram, Diagram.prototype);
  };
}

export default DiagramRepository;
