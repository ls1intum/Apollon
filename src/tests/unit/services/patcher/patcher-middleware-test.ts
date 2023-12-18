import sleep from 'sleep-promise';

import { createPatcherMiddleware } from '../../../../main/services/patcher/patcher-middleware';
import { Patcher } from '../../../../main/services/patcher/patcher';

describe('patcher middleware.', () => {
  test('should induce changes to the state to be reflected to the patcher.', async () => {
    const cb = jest.fn();
    const patcher = new Patcher<{ x: number }>();
    let state = { x: 42 };

    const middleware = createPatcherMiddleware(patcher);
    patcher.subscribe(cb);

    middleware({ getState: () => state } as any)((() => {
      state = { x: 43 };
      return state;
    }) as any)('ladida');

    await sleep(1);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(patcher.snapshot).toEqual({ x: 43 });
  });

  test('should induce continuous changes when the action is continuous.', async () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    const cb3 = jest.fn();

    const patcher = new Patcher<{ x: number }>();
    patcher.subscribe(cb1);
    patcher.subscribeToContinuousChanges(cb2);
    patcher.subscribeToDiscreteChanges(cb3);

    let state = { x: 42 };

    const action1 = { type: 'a1' };
    const action2 = { type: 'a2' };
    const dispatch = (action: { type: string }) => {
      state = { x: state.x + 1 };
      return state;
    };

    const middleware = createPatcherMiddleware(patcher, {
      selectDiscrete: (action) => action.type === 'a1',
      selectContinuous: (action) => action.type === 'a2',
    });

    const run = middleware({ getState: () => state } as any);

    run(dispatch as any)(action1);
    await sleep(1);

    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(0);
    expect(cb3).toHaveBeenCalledTimes(1);
    expect(patcher.snapshot).toEqual({ x: 43 });

    run(dispatch as any)(action2);
    await sleep(1);

    expect(cb1).toHaveBeenCalledTimes(2);
    expect(cb2).toHaveBeenCalledTimes(1);
    expect(cb3).toHaveBeenCalledTimes(1);
    expect(patcher.snapshot).toEqual({ x: 43 });

    run(dispatch as any)(action1);
    await sleep(1);

    expect(cb1).toHaveBeenCalledTimes(3);
    expect(cb2).toHaveBeenCalledTimes(1);
    expect(cb3).toHaveBeenCalledTimes(2);
    expect(patcher.snapshot).toEqual({ x: 45 });
  });
});
