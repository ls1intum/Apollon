import React, { ComponentType, ReactChildren, ReactElement } from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { Store } from 'redux';
import { Theme } from '../../../main/components/theme/theme';
import { I18nProvider } from '../../../main/components/i18n/i18n-provider';
import { ModelState } from '../../../main/components/store/model-state';
import { MockStoreEnhanced } from 'redux-mock-store';
import { DispatchExts } from './test-utils';

type AllProvidersProps = {
  children: ReactChildren;
};

type CustomOptions = {
  store: MockStoreEnhanced<ModelState, DispatchExts> | Store<ModelState, any>;
};

export function wrappedRender(ui: ReactElement, options: CustomOptions) {
  function AllProviders(props: AllProvidersProps): ReactElement {
    return (
      <Provider store={options.store}>
        <Theme>
          <I18nProvider>{props.children}</I18nProvider>
        </Theme>
      </Provider>
    );
  }

  const returns = render(ui, {
    wrapper: AllProviders as ComponentType,
    ...options,
  });

  return { ...returns };
}
