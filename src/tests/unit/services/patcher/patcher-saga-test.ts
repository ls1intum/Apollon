import { call, debounce, delay, select, take } from 'redux-saga/effects';

import { patchLayout } from '../../../../main/services/patcher/patcher-saga';
import { PatcherActionTypes, PatcherRepository } from '../../../../main/services/patcher';
import { UMLElementState } from '../../../../main/services/uml-element/uml-element-types';
import { IUMLRelationship } from '../../../../main/services/uml-relationship/uml-relationship';
import { render } from '../../../../main/services/layouter/layouter';
import { recalc } from '../../../../main/services/uml-relationship/uml-relationship-saga';

describe('test patcher saga.', () => {
  test('it invokes re-renders and re-calcs after a patch.', () => {
    const run = patchLayout();
    const debounced = run.next().value;
    expect(debounced).toEqual(debounce(100, PatcherActionTypes.PATCH, expect.any(Function)));

    const fork = debounced['payload']['args'][2]();
    expect(fork.next(PatcherRepository.patch([{ op: 'add', path: '/x', value: 42 }])).value).toEqual(select());

    const elements: UMLElementState = {
      x: {
        type: 'Package',
        id: 'x',
        name: 'package',
        owner: null,
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      },
      y: {
        type: 'Class',
        id: 'y',
        name: 'class',
        owner: 'x',
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      },
      z: {
        type: 'Class',
        id: 'z',
        name: 'class',
        owner: null,
        bounds: { x: 0, y: 0, width: 100, height: 100 },
      },
      w: {
        type: 'ClassInheritance',
        id: 'w',
        name: '...',
        owner: null,
        source: { element: 'y', direction: 'Up' },
        target: { element: 'z', direction: 'Down' },
        path: [
          { x: 0, y: 0 },
          { x: 200, y: 100 },
        ],
        bounds: { x: 0, y: 0, width: 200, height: 100 },
      } as IUMLRelationship,
    };

    fork.next({ elements });

    expect(fork.next().value).toEqual(delay(0));
    expect(fork.next().value).toEqual(call(render, 'x'));

    expect(fork.next().value).toEqual(delay(0));
    expect(fork.next().value).toEqual(call(render, 'y'));

    expect(fork.next().value).toEqual(delay(0));
    expect(fork.next().value).toEqual(call(render, 'z'));

    expect(fork.next().value).toEqual(delay(0));
    expect(fork.next().value).toEqual(call(recalc, 'w'));
  });
});
