import React, { createRef, RefObject } from 'react';
import { IUMLElement } from '../../../main/services/uml-element/uml-element';
import { UMLClass } from '../../../main/packages/uml-class-diagram/uml-class/uml-class';
import { UMLClassAttribute } from '../../../main/packages/uml-class-diagram/uml-class-attribute/uml-class-attribute';
import { UMLClassMethod } from '../../../main/packages/uml-class-diagram/uml-class-method/uml-class-method';
import { render, fireEvent } from '@testing-library/react';
import { AssessmentSection } from '../../../main/components/assessment/assessment-section';
import { Theme } from '../../../main/components/theme/theme';
import { I18nProvider } from '../../../main/components/i18n/i18n-provider';
import { ModelStore, StoreProvider } from '../../../main/components/store/model-store';
import { Locale } from '../../../main';

describe('test AssessmentSection', () => {
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
            <AssessmentSection element={elements[0]} />
          </Theme>
        </I18nProvider>
      </StoreProvider>,
    );

    const sut = container.firstChild;
    expect(sut).not.toBeNull();
  });
  it('it can be scored', () => {
    const store: RefObject<ModelStore> = createRef();
    const elementToScore = elements[0]
    const score = 5;

    const { getByText } = render(
      <StoreProvider
        ref={store}
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
            <AssessmentSection element={elementToScore} />
          </Theme>
        </I18nProvider>
      </StoreProvider>,
    );

    // assumption: Textfield immediately after label
    const sut = getByText('Score:').nextSibling;
    if (!sut) {
      throw Error('SUT could not be found');
    }
    fireEvent.change(sut, {
      target: { value: score },
    });

    expect(Object.keys(store.current!.state.store.getState().assessments)).toHaveLength(1);
    expect(store.current!.state.store.getState().assessments[elementToScore.id].score).toEqual(score);
  });
  it('it can be given feedback', () => {
    const store: RefObject<ModelStore> = createRef();
    const elementToGiveFeedback = elements[0]
    const feedback = "Nicely Done!";

    const { getByPlaceholderText } = render(
      <StoreProvider
        ref={store}
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
            <AssessmentSection element={elementToGiveFeedback} />
          </Theme>
        </I18nProvider>
      </StoreProvider>,
    );

    const sut = getByPlaceholderText('Feedback');
    if (!sut) {
      throw Error('SUT could not be found');
    }
    fireEvent.change(sut, {
      target: { value: feedback },
    });

    expect(Object.keys(store.current!.state.store.getState().assessments)).toHaveLength(1);
    expect(store.current!.state.store.getState().assessments[elementToGiveFeedback.id].feedback).toEqual(feedback);
  });
});
