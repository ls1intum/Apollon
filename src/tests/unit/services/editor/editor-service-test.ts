import { getRealStore } from '../../test-utils/test-utils';
import { ApollonView } from '../../../../main/services/editor/editor-types';
import { EditorRepository } from '../../../../main/services/editor/editor-repository';

describe('test editor redux state update', () => {
  it('change view', () => {
    const store = getRealStore({
      editor: {
        view: ApollonView.Modelling,
      },
    });
    expect(store.getState().editor.view).toEqual(ApollonView.Modelling);
    store.dispatch(EditorRepository.changeView(ApollonView.Exporting));
    expect(store.getState().editor.view).toEqual(ApollonView.Exporting);
  });
});
