import * as React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { DefaultPopup } from '../../../../main/packages/common/default-popup';
import { UMLActivityActionNode } from '../../../../main/packages/uml-activity-diagram/uml-activity-action-node/uml-activity-action-node';
import { getRealStore } from '../../../test-utils/test-utils';
import { Provider } from 'react-redux';
import { Theme } from '../../../../main/components/theme/theme';

describe('test default element popup', () => {
  it('render', () => {
    const element: UMLActivityActionNode = new UMLActivityActionNode({
      id: 'test-id',
      name: 'TestActivityComponent',
    });

    const store = getRealStore();

    const { baseElement } = render(
      <Provider store={store}>
        <Theme>
          <svg>
            <DefaultPopup element={element} />
          </svg>
        </Theme>
      </Provider>,
    );
    expect(baseElement).toMatchSnapshot();
  });
  it('delete Element', () => {
    const element: UMLActivityActionNode = new UMLActivityActionNode({
      id: 'test-id',
      name: 'TestActivityComponent',
    });

    const store = getRealStore(undefined, [element]);

    const { getByRole } = render(
      <Provider store={store}>
        <Theme>
          <svg>
            <DefaultPopup element={element} />
          </svg>
        </Theme>
      </Provider>,
    );

    const deleteButton = getByRole('button');
    fireEvent.click(deleteButton);

    expect(store.getState().elements).not.toContain(element.id);
  });
});
