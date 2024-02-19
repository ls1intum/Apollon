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
import {
  createPatcherMiddleware,
  createPatcherReducer,
  isContinuousAction,
  isDiscreteAction,
  isSelectionAction,
  Patcher,
} from '../../services/patcher';
import { UMLModel } from '../../typings';
import { merge } from './merge';

type OwnProps = PropsWithChildren<{
  initialState?: PreloadedState<PartialModelState>;
  patcher?: Patcher<UMLModel>;
}>;

type Props = OwnProps & CanvasContext;

export const createReduxStore = (
  initialState: PreloadedState<PartialModelState> = {},
  layer: ILayer | null = null,
  patcher?: Patcher<UMLModel>,
): Store<ModelState, Actions> => {
  const baseReducer: Reducer<ModelState, Actions> = undoable(combineReducers<ModelState, Actions>(reducers));
  const patchReducer =
    patcher &&
    createPatcherReducer<UMLModel, ModelState>(patcher, {
      transform: (model) => ModelState.fromModel(model) as ModelState,
      transformInverse: (state) => ModelState.toModel(state),
      merge,
    });

  const reducer: Reducer<ModelState, Actions> = (state, action) => {
    const baseState = baseReducer(state, action);
    if (patchReducer) {
      return patchReducer(baseState, action);
    } else {
      return baseState;
    }
  };

  const sagaMiddleware: SagaMiddleware<SagaContext> = createSagaMiddleware<SagaContext>({ context: { layer } });

  const middleware: StoreEnhancer<{ dispatch: Dispatch }, {}> = applyMiddleware(
    ...[
      thunk as ThunkMiddleware<ModelState, Actions>,
      sagaMiddleware,
      ...(patcher
        ? [
            createPatcherMiddleware<UMLModel, Actions, ModelState>(patcher, {
              selectDiscrete: (action) => isDiscreteAction(action) || isSelectionAction(action),
              selectContinuous: (action) => isContinuousAction(action),
              transform: (state) => ModelState.toModel(state),
            }),
          ]
        : []),
    ],
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
  patcher?: Patcher<UMLModel>,
): { store: Store<ModelState, Actions> } => {
  const store = createReduxStore(initialState, layer, patcher);
  return { store };
};

type State = ReturnType<typeof getInitialState>;

export class ModelStore extends Component<Props, State> {
  state = getInitialState(this.props.initialState, this.props.canvas, this.props.patcher);

  componentDidUpdate(prevProps: Props) {
    if (prevProps.canvas !== this.props.canvas) {
      const state: State = getInitialState(this.props.initialState, this.props.canvas, this.props.patcher);
      this.setState(state);
    }
  }

  render() {
    return <Provider store={this.state.store}>{this.props.children}</Provider>;
  }
}

export const StoreProvider = withCanvas(ModelStore);
