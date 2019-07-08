import React, { PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, compose, createStore, DeepPartial, Store } from 'redux';
import createSagaMiddleware from 'redux-saga';
import thunk, { ThunkMiddleware } from 'redux-thunk';
import { Actions } from '../../services/actions';
import { ILayer } from '../../services/layouter/layer';
import { LayouterRepository } from '../../services/layouter/layouter-repository';
import { reducers } from '../../services/reducer';
import { saga, SagaContext } from '../../services/saga';
import { undoable } from '../../services/undo/undo-reducer';
import { CanvasContext } from '../canvas/canvas-context';
import { withCanvas } from '../canvas/with-canvas';
import { ModelState } from './model-state';

type OwnProps = PropsWithChildren<{
  initialState?: DeepPartial<ModelState>;
}>;

type Props = OwnProps & CanvasContext;

const getInitialState = (
  initialState: DeepPartial<ModelState> = {},
  layer: ILayer | null = null,
): Store<ModelState, Actions> => {
  const reducer = undoable(combineReducers<ModelState, Actions>(reducers));
  const sagaMiddleware = createSagaMiddleware<SagaContext>({ context: { layer } });

  const composeEnhancers: typeof compose = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
  const enhancer = composeEnhancers(applyMiddleware(thunk as ThunkMiddleware<ModelState, Actions>, sagaMiddleware));

  const store = createStore(reducer, initialState, enhancer);

  if (layer) {
    sagaMiddleware.run(saga);
    store.dispatch(LayouterRepository.layout());
  }

  return store;
};

type State = ReturnType<typeof getInitialState>;

export class ModelStore extends React.Component<Props, State> {
  state = getInitialState(this.props.initialState, this.props.canvas);

  componentDidUpdate(prevProps: Props) {
    if (prevProps.canvas !== this.props.canvas) {
      this.setState(getInitialState(this.props.initialState, this.props.canvas));
    }
  }

  render() {
    return <Provider store={this.state}>{this.props.children}</Provider>;
  }
}

export const StoreProvider = withCanvas(ModelStore);
