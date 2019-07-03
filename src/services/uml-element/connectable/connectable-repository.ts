import { DefaultUMLRelationshipType, UMLRelationshipType } from '../../../packages/uml-relationship-type';
import { UMLRelationships } from '../../../packages/uml-relationships';
import { AsyncAction } from '../../../utils/actions/actions';
import { Connection } from '../../uml-relationship/connection';
import { Direction, IUMLElementPort } from '../uml-element-port';
import { UMLElementRepository } from '../uml-element-repository';
import { ConnectableActionTypes, ConnectEndAction, ConnectStartAction } from './connectable-types';

export const Connectable = {
  startConnecting: (direction: Direction | Direction[], id?: string | string[]): AsyncAction => (
    dispatch,
    getState,
  ) => {
    const ids = id ? (Array.isArray(id) ? id : [id]) : getState().selected;
    const directions = Array.isArray(direction) ? direction : [direction];
    if (!ids.length || (directions.length !== 1 && directions.length !== ids.length)) {
      return;
    }

    const ports = ids.map<IUMLElementPort>((element, index) => ({
      element,
      direction: directions.length === 1 ? directions[0] : directions[index],
    }));

    dispatch<ConnectStartAction>({
      type: ConnectableActionTypes.START,
      payload: { ports },
    });
  },

  connect: (target: IUMLElementPort | IUMLElementPort[], source?: IUMLElementPort | IUMLElementPort[]): AsyncAction => (
    dispatch,
    getState,
  ) => {
    const sources = source ? (Array.isArray(source) ? source : [source]) : getState().connecting;
    const targets = Array.isArray(target) ? target : [target];
    if (!targets.length || (targets.length !== 1 && targets.length !== sources.length)) {
      return;
    }

    const connections: Connection[] = [];
    for (const [index, port] of sources.entries()) {
      if (port === targets[index]) {
        continue;
      }

      connections.push({ source: port, target: targets.length === 1 ? targets[0] : targets[index] });
    }

    const type: UMLRelationshipType = DefaultUMLRelationshipType[getState().diagram.type];
    const Classifier = UMLRelationships[type];
    const relationships = connections.map(connection => new Classifier(connection));

    dispatch(UMLElementRepository.create(relationships));

    if (!source) {
      dispatch<ConnectEndAction>({
        type: ConnectableActionTypes.END,
        payload: { ports: sources },
      });
    }
  },

  endConnecting: (port?: IUMLElementPort | IUMLElementPort[]): AsyncAction => (dispatch, getState) => {
    const ports = port ? (Array.isArray(port) ? port : [port]) : getState().connecting;
    if (!ports.length) {
      return;
    }

    dispatch<ConnectEndAction>({
      type: ConnectableActionTypes.END,
      payload: { ports },
    });
  },
};
