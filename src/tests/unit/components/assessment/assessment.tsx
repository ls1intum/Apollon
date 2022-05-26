import { IUMLElement } from '../../../../main/services/uml-element/uml-element';
import { UMLClass } from '../../../../main/packages/uml-class-diagram/uml-class/uml-class';
import { UMLClassAttribute } from '../../../../main/packages/uml-class-diagram/uml-class-attribute/uml-class-attribute';
import { UMLClassMethod } from '../../../../main/packages/uml-class-diagram/uml-class-method/uml-class-method';
import { render } from '@testing-library/react';
import * as React from 'react';
import { Assessment } from '../../../../main/components/assessment/assessment';
import { StoreProvider } from '../../../../main/components/store/model-store';
import { I18nProvider } from '../../../../main/components/i18n/i18n-provider';
import { Locale } from '../../../../main';
import { Theme } from '../../../../main/components/theme/theme';

describe('test AssessmentCopmponent', () => {
  const elements: IUMLElement[] = [];

  beforeEach(() => {
    const umlClass = new UMLClass({ name: 'test-element' });
    const umlClassAttribute = new UMLClassAttribute({
      name: 'attribute',
      owner: umlClass.id,
    });
    const umlClassMethod = new UMLClassMethod({
      name: 'classMethod',
      owner: umlClass.id,
    });
    umlClass.ownedElements = [umlClassAttribute.id, umlClassMethod.id];
    elements.push(umlClass, umlClassAttribute, umlClassMethod);
  });
  it('it can be rendered', () => {
    const { container } = render(
      <StoreProvider
        initialState={{
          elements: {
            [elements[0].id]: { ...elements[0] },
            [elements[1].id]: { ...elements[1] },
            [elements[2].id]: { ...elements[2] },
          },
        }}
      >
        <I18nProvider locale={Locale.en}>
          <Theme styles={undefined}>
            <Assessment element={elements[0]} />
          </Theme>
        </I18nProvider>
      </StoreProvider>,
    );

    const sut = container.firstChild;
    expect(sut).not.toBeNull();
  });
});
