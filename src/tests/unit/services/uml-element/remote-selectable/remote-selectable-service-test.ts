import { getRealStore } from '../../../test-utils/test-utils';
import { UMLClass } from '../../../../../main/packages/uml-class-diagram/uml-class/uml-class';
import { RemoteSelectable } from '../../../../../main/services/uml-element/remote-selectable/remote-selection-repository';

describe('test redux state upon changing remote selection.', () => {
  test('elements can be selected.', () => {
    const classA = new UMLClass({ name: 'ClassA' });
    const classB = new UMLClass({ name: 'ClassB' });

    const john = { name: 'John', color: 'red' };
    const jane = { name: 'Jane', color: 'blue' };

    const store = getRealStore({}, [classA, classB]);

    expect(store.getState().remoteSelection).toEqual({});

    store.dispatch(RemoteSelectable.remoteSelect(john, [classA.id]));
    expect(store.getState().remoteSelection).toEqual({ [classA.id]: [john] });

    store.dispatch(RemoteSelectable.remoteSelect(jane, [classA.id, classB.id]));
    expect(store.getState().remoteSelection).toEqual({ [classA.id]: [john, jane], [classB.id]: [jane] });

    store.dispatch(RemoteSelectable.remoteDeselect(jane, [classA.id]));
    expect(store.getState().remoteSelection).toEqual({ [classA.id]: [john], [classB.id]: [jane] });

    store.dispatch(RemoteSelectable.remoteSelectDeselect(john, [classB.id], [classA.id]));
    expect(store.getState().remoteSelection).toEqual({ [classA.id]: [], [classB.id]: [jane, john] });

    store.dispatch(RemoteSelectable.pruneRemoteSelectors([jane]));
    expect(store.getState().remoteSelection).toEqual({ [classA.id]: [], [classB.id]: [jane] });
  });
});
