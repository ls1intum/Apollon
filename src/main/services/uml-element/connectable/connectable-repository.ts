import { DefaultUMLRelationshipType, UMLRelationshipType } from '../../../packages/uml-relationship-type';
import { UMLRelationships } from '../../../packages/uml-relationships';
import { AsyncAction } from '../../../utils/actions/actions';
import { Connection } from '../../uml-relationship/connection';
import { UMLElementCommonRepository } from '../uml-element-common-repository';
import { Direction, IUMLElementPort } from '../uml-element-port';
import { ConnectableActionTypes, ConnectEndAction, ConnectStartAction } from './connectable-types';
import { UMLElements } from '../../../packages/uml-elements';
import { UMLElementType } from '../../..';
import { UMLRelationshipCommonRepository } from '../../uml-relationship/uml-relationship-common-repository';

export const Connectable = {
  startConnecting:
    (direction: Direction | Direction[], id?: string | string[]): AsyncAction =>
    (dispatch, getState) => {
      const ids = id
        ? Array.isArray(id)
          ? id
          : [id]
        : getState()
            .selected.map((elementId) => dispatch(UMLElementCommonRepository.getById(elementId)))
            .filter((element) => element !== null)
            .filter((element) => UMLElements[element!.type as UMLElementType].features.connectable)
            .map((element) => element!.id);
      const directions = Array.isArray(direction) ? direction : [direction];
      if (!ids.length || (directions.length !== 1 && directions.length !== ids.length)) {
        return;
      }

      const ports = ids.map<IUMLElementPort>((elementId, index) => ({
        element: elementId,
        direction: directions.length === 1 ? directions[0] : directions[index],
      }));

      dispatch<ConnectStartAction>({
        type: ConnectableActionTypes.START,
        payload: { ports },
        undoable: false,
      });
    },

  connect:
    (target: IUMLElementPort | IUMLElementPort[], source?: IUMLElementPort | IUMLElementPort[]): AsyncAction =>
    (dispatch, getState) => {
      const sources = source ? (Array.isArray(source) ? source : [source]) : getState().connecting;
      const targets = Array.isArray(target) ? target : [target];
      if (!targets.length || (targets.length !== 1 && targets.length !== sources.length)) {
        return;
      }

      const connections: Connection[] = [];
      for (const [index, port] of sources.entries()) {
        // try to connect to target - if target.length === 1 -> connect to same element
        const connectionTarget = targets.length === 1 ? targets[0] : targets[index];
        if (port.element === connectionTarget.element && port.direction === connectionTarget.direction) {
          continue;
        }

        connections.push({ source: port, target: connectionTarget });
      }

      const relationships = connections.map((connection) => {
        const sourceElement = dispatch(UMLElementCommonRepository.getById(connection.source.element));
        const targetElement = dispatch(UMLElementCommonRepository.getById(connection.target.element));
        let relationshipType: UMLRelationshipType;
        // determine the common supported connection types and choose one for the connection
        if (sourceElement && targetElement) {
          const commonSupportedConnections = UMLRelationshipCommonRepository.getSupportedConnectionsForElements([
            sourceElement,
            targetElement,
          ]);
          // take the first common supported connection type or default diagram type
          relationshipType =
            commonSupportedConnections.length > 0
              ? commonSupportedConnections[0]
              : DefaultUMLRelationshipType[getState().diagram.type];
        } else {
          // take default diagram type
          relationshipType = DefaultUMLRelationshipType[getState().diagram.type];
        }
        const Classifier = UMLRelationships[relationshipType];
        return new Classifier(connection);
      });
      if (connections.length) {
        dispatch(UMLElementCommonRepository.create(relationships));
      }

      if (!source) {
        dispatch<ConnectEndAction>({
          type: ConnectableActionTypes.END,
          payload: { ports: sources },
          undoable: false,
        });
      }
    },

  endConnecting:
    (port?: IUMLElementPort | IUMLElementPort[]): AsyncAction =>
    (dispatch, getState) => {
      const ports = port ? (Array.isArray(port) ? port : [port]) : getState().connecting;
      if (!ports.length) {
        return;
      }

      dispatch<ConnectEndAction>({
        type: ConnectableActionTypes.END,
        payload: { ports },
        undoable: false,
      });
    },
};
