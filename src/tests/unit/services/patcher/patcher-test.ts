import sleep from 'sleep-promise';

import { Patcher } from '../../../../main/services/patcher';

describe('patcher class.', () => {
  test('shoult invoke given comparator on check.', () => {
    const cb = jest.fn();
    const patcher = new Patcher({ diff: cb });
    patcher.subscribe(jest.fn());
    patcher.initialize({});
    patcher.check({ x: 42 });

    expect(cb).toHaveBeenCalledWith({}, { x: 42 });
  });

  test('should not check without subscribers.', () => {
    const cb = jest.fn();
    const patcher = new Patcher({ diff: cb });
    patcher.initialize({});
    patcher.check({ x: 42 });

    expect(cb).not.toHaveBeenCalled();

    const sub = patcher.subscribe(jest.fn());
    patcher.check({ x: 42 });
    expect(cb).toHaveBeenCalledTimes(1);

    patcher.unsubscribe(sub);
    patcher.check({ x: 42 });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test('it should inform subscribers of incoming patches, batching them.', async () => {
    const cb = jest.fn();
    const patcher = new Patcher();
    patcher.initialize({});

    const sub = patcher.subscribe(cb);
    patcher.check({ x: 42 });

    await sleep(1);

    expect(cb).toHaveBeenCalledWith([{ op: 'add', path: '/x', value: 42 }]);

    patcher.check({ x: 43 });
    patcher.check({ x: 43, y: 'hello' });

    await sleep(1);

    expect(cb).toHaveBeenCalledWith([
      { op: 'replace', path: '/x', value: 43 },
      { op: 'add', path: '/y', value: 'hello' },
    ]);
  });

  test('can patch its snapshot.', async () => {
    const cb = jest.fn();

    const patcher = new Patcher();
    patcher.subscribe(cb);
    patcher.initialize({ x: 42 });
    patcher.patch([{ op: 'replace', path: '/x', value: 43 }]);

    patcher.check({ x: 43 });

    await sleep(1);

    expect(cb).not.toHaveBeenCalled();
  });

  test('skips erroneous operations while patching.', () => {
    const patcher = new Patcher();
    patcher.initialize({ x: 42 });
    expect(() => patcher.patch([{ op: 'replace', path: '/y/5', value: 43 }])).not.toThrow();
  });

  test('it throws an error if not initialised.', () => {
    const patcher = new Patcher();
    expect(() => patcher.check({})).toThrow();
  });

  test('supports continuous patches.', async () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    const cb3 = jest.fn();

    const patcher = new Patcher();
    patcher.subscribe(cb1);
    patcher.subscribeToContinuousChanges(cb2);
    patcher.subscribeToDiscreteChanges(cb3);

    patcher.initialize({ x: 42 });
    patcher.check({ x: 43 });
    await sleep(1);

    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(0);
    expect(cb3).toHaveBeenCalledTimes(1);
    expect(patcher.snapshot).toEqual({ x: 43 });

    patcher.checkContinuous({ x: 44 });
    await sleep(1);

    expect(cb1).toHaveBeenCalledTimes(2);
    expect(cb2).toHaveBeenCalledTimes(1);
    expect(cb3).toHaveBeenCalledTimes(1);
    expect(patcher.snapshot).toEqual({ x: 43 });

    patcher.check({ x: 45 });
    await sleep(1);

    expect(cb1).toHaveBeenCalledTimes(3);
    expect(cb2).toHaveBeenCalledTimes(1);
    expect(cb3).toHaveBeenCalledTimes(2);
    expect(patcher.snapshot).toEqual({ x: 45 });
  });
});
