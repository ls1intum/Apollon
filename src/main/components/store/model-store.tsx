import React, { Component, PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import {
  applyMiddleware,
  combineReducers,
  compose,
  createStore,
  PreloadedState,
  Reducer,
  Store,
  StoreEnhancer,
} from 'redux';
import createSagaMiddleware, { SagaMiddleware } from 'redux-saga';
import thunk, { ThunkMiddleware } from 'redux-thunk';
import { Actions } from '../../services/actions';
import { ILayer } from '../../services/layouter/layer';
import { LayouterRepository } from '../../services/layouter/layouter-repository';
import { reducers } from '../../services/reducer';
import { saga, SagaContext } from '../../services/saga';
import { undoable } from '../../services/undo/undo-reducer';
import { Dispatch } from '../../utils/actions/actions';
import { CanvasContext } from '../canvas/canvas-context';
import { withCanvas } from '../canvas/with-canvas';
import { ModelState, PartialModelState } from './model-state';

type OwnProps = PropsWithChildren<{
  initialState?: PreloadedState<PartialModelState>;
}>;

type Props = OwnProps & CanvasContext;

export const createReduxStore = (
  initialState: PreloadedState<PartialModelState> = {},
  layer: ILayer | null = null,
): Store<ModelState, Actions> => {
  const reducer: Reducer<ModelState, Actions> = undoable(combineReducers<ModelState, Actions>(reducers));
  const sagaMiddleware: SagaMiddleware<SagaContext> = createSagaMiddleware<SagaContext>({ context: { layer } });

  const middleware: StoreEnhancer<{ dispatch: Dispatch }, {}> = applyMiddleware(
    thunk as ThunkMiddleware<ModelState, Actions>,
    sagaMiddleware,
  );
  const composeEnhancers: typeof compose = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
  const enhancer = composeEnhancers(middleware);

  const store: Store<ModelState, Actions> = createStore(reducer, initialState as ModelState, enhancer);

  if (layer) {
    sagaMiddleware.run(saga);
    store.dispatch(LayouterRepository.layout());
  }
  return store;
};

const getInitialState = (
  initialState: PreloadedState<PartialModelState> = {},
  layer: ILayer | null = null,
): { store: Store<ModelState, Actions> } => {
  const store = createReduxStore(initialState, layer);
  return { store };
};

type State = ReturnType<typeof getInitialState>;

export class ModelStore extends Component<Props, State> {
  state = getInitialState(this.props.initialState, this.props.canvas);

  componentDidUpdate(prevProps: Props) {
    if (prevProps.canvas !== this.props.canvas) {
      const state: State = getInitialState(this.props.initialState, this.props.canvas);
      this.setState(state);
    }
  }

  render() {
    return <Provider store={this.state.store}>{this.props.children}</Provider>;
  }
}

export const StoreProvider = withCanvas(ModelStore);
