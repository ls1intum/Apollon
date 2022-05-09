import * as React from 'react';
import { fireEvent } from '@testing-library/react';
import { wrappedRender } from '../../../test-utils/render';
import { getRealStore } from '../../../test-utils/test-utils';
import { Provider } from 'react-redux';
import { Theme } from '../../../../../main/components/theme/theme';
import { UMLObjectLink } from '../../../../../main/packages/uml-object-diagram/uml-object-link/uml-object-link';
import { DefaultRelationshipPopup } from '../../../../../main/packages/common/default-relationship-popup';
import { I18nProvider } from '../../../../../main/components/i18n/i18n-provider';

describe('test default relationship popup', () => {
  it('render', () => {
    const element: UMLObjectLink = new UMLObjectLink({
      id: 'test-id',
      name: 'TestObjectLink',
    });

    const store = getRealStore();

    const { baseElement } = wrappedRender(
      <I18nProvider>
        <Provider store={store}>
          <Theme>
            <svg>
              <DefaultRelationshipPopup element={element} />
            </svg>
          </Theme>
        </Provider>
      </I18nProvider>,
    );
    expect(baseElement).toMatchSnapshot();
  });
  it('delete Element', () => {
    const element: UMLObjectLink = new UMLObjectLink({
      id: 'test-id',
      name: 'TestObjectLink',
    });

    const store = getRealStore(undefined, [element]);

    const { getByRole } = wrappedRender(
      <I18nProvider>
        <Provider store={store}>
          <Theme>
            <svg>
              <DefaultRelationshipPopup element={element} />
            </svg>
          </Theme>
        </Provider>
      </I18nProvider>,
    );

    const deleteButton = getByRole('button');
    fireEvent.click(deleteButton);

    expect(store.getState().elements).not.toContain(element.id);
  });
});
