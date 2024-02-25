import { createPatcherReducer } from '../../../../main/services/patcher/patcher-reducer';
import { Patcher } from '../../../../main/services/patcher/patcher';
import { PatcherRepository } from '../../../../main/services/patcher';

describe('test patcher reducer.', () => {
  test('it invokes the patcher when receiving a patch action.', () => {
    const patcher = new Patcher();
    patcher.initialize({});

    const reducer = createPatcherReducer(patcher);
    const nextState = reducer({}, PatcherRepository.patch([{ op: 'add', path: '/x', value: 42 }]));

    expect(nextState).toEqual({ x: 42 });
    expect(patcher.snapshot).toEqual({ x: 42 });
  });

  test('calls given transform function for applying the patch.', () => {
    const cb = jest.fn((x) => ({ y: x.x }));
    const inv = (x: any) => ({ x: x.y });

    const patcher = new Patcher();
    patcher.initialize({});

    const reducer = createPatcherReducer(patcher, { transform: cb, transformInverse: inv });
    const nextState = reducer({ y: 41 }, PatcherRepository.patch([{ op: 'add', path: '/x', value: 42 }]));

    expect(nextState).toEqual({ y: 42 });
  });

  test('passes the state to the patcher.', () => {
    const patcher = new Patcher();
    patcher.initialize({});

    const reducer = createPatcherReducer(patcher);
    const nextState = reducer({ y: 41 }, PatcherRepository.patch([{ op: 'add', path: '/x', value: 42 }]));

    expect(nextState).toEqual({ x: 42, y: 41 });
  });

  test('calls given merge function for applying the patch.', () => {
    const cb = jest.fn((x, y) => ({ ...x, ...y }));

    const patcher = new Patcher();
    patcher.initialize({});

    const reducer = createPatcherReducer(patcher, { merge: cb });
    const nextState = reducer({ y: 41 }, PatcherRepository.patch([{ op: 'add', path: '/x', value: 42 }]));

    expect(nextState).toEqual({ x: 42, y: 41 });
  });

  test('handles weird options.', () => {
    expect(() => createPatcherReducer(new Patcher(), {})).not.toThrow();
  });
});
